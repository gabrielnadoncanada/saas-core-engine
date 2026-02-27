import "server-only";

import { Prisma, prisma } from "@db";
import { NextResponse } from "next/server";

import type { OAuthProvider } from "@contracts";

import { createOAuthLoginFlow, createOAuthStateService } from "@/server/adapters/core/auth-core.adapter";
import { createAndSetSession } from "@/server/auth/create-and-set-session";
import { isOAuthLinkIntent } from "@/server/auth/oauth-link-intent";
import { getSessionUser } from "@/server/auth/require-user";
import { isOAuthProviderEnabled } from "@/server/auth/sign-in-methods";
import { routes } from "@/shared/constants/routes";

export type OAuthClaims = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
};

const SETTINGS_PATH = routes.app.settingsAuthentication;

function settingsRedirect(
  req: Request,
  params: { error?: string; success?: string },
) {
  const url = new URL(SETTINGS_PATH, req.url);
  if (params.error) url.searchParams.set("signin_error", params.error);
  if (params.success) url.searchParams.set("signin_success", params.success);
  return NextResponse.redirect(url);
}

export async function handleOAuthCallback(params: {
  provider: OAuthProvider;
  exchangeFn: (code: string, codeVerifier: string) => Promise<OAuthClaims>;
  request: Request;
}): Promise<Response> {
  const { provider, exchangeFn, request: req } = params;

  if (!isOAuthProviderEnabled(provider)) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_not_configured", req.url),
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (!state) {
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", req.url));
  }

  const stateSvc = createOAuthStateService();
  const consumed = await stateSvc.consume({ provider, state });

  if (!consumed) {
    return NextResponse.redirect(new URL("/login?error=oauth_expired", req.url));
  }

  const linking = isOAuthLinkIntent(consumed.redirectPath, provider);

  if (oauthError) {
    if (linking) return settingsRedirect(req, { error: "oauth_cancelled" });
    return NextResponse.redirect(new URL("/login?error=oauth_cancelled", req.url));
  }

  if (!code) {
    if (linking) return settingsRedirect(req, { error: "oauth_invalid" });
    return NextResponse.redirect(new URL("/login?error=oauth_invalid", req.url));
  }

  try {
    const claims = await exchangeFn(code, consumed.codeVerifier);

    // --- Link flow: attach OAuth identity to existing user ---
    if (linking) {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return settingsRedirect(req, { error: "reauth_required" });
      }

      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.oAuthAccount.findUnique({
            where: {
              provider_providerAccountId: {
                provider,
                providerAccountId: claims.sub,
              },
            },
          });

          if (existing && existing.userId !== sessionUser.userId) {
            throw new Error("oauth_identity_in_use");
          }

          if (existing && existing.userId === sessionUser.userId) {
            await tx.oAuthAccount.update({
              where: { id: existing.id },
              data: { email: claims.email?.toLowerCase() ?? existing.email },
            });
            return;
          }

          await tx.oAuthAccount.create({
            data: {
              userId: sessionUser.userId,
              provider,
              providerAccountId: claims.sub,
              email: claims.email?.toLowerCase() ?? null,
            },
          });
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "oauth_identity_in_use"
        ) {
          return settingsRedirect(req, { error: "identity_already_linked" });
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return settingsRedirect(req, { error: "identity_already_linked" });
        }
        throw error;
      }

      const label = provider === "google" ? "google" : "github";
      return settingsRedirect(req, { success: `${label}_connected` });
    }

    // --- Login flow: find/create user then create session ---
    const oauthFlow = createOAuthLoginFlow();
    const linked = await oauthFlow.linkOrCreate({
      provider,
      providerAccountId: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
    });

    await prisma.oAuthAccount.updateMany({
      where: {
        userId: linked.userId,
        provider,
        providerAccountId: claims.sub,
      },
      data: {
        lastUsedAt: new Date(),
        email: claims.email?.toLowerCase() ?? null,
      },
    });

    await createAndSetSession({ userId: linked.userId, request: req });

    return NextResponse.redirect(
      new URL(consumed.redirectPath || "/dashboard", req.url),
    );
  } catch {
    if (linking) return settingsRedirect(req, { error: "oauth_failed" });
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}
