import {
  EmailTokenService,
  LoginFlow,
  MagicLoginFlow,
  OAuthLoginFlow,
  OAuthStateService,
  PasswordResetFlow,
  SessionService,
  SignupFlow,
  VerifyEmailFlow,
  type PepperConfig,
} from "@auth-core";
import { env } from "@/server/config/env";
import { EmailTokensRepo } from "@/server/db-repos/email-tokens.repo";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";
import { OAuthAccountsRepo } from "@/server/db-repos/oauth-accounts.repo";
import { OAuthStatesRepo } from "@/server/db-repos/oauth-states.repo";
import { OrgsRepo } from "@/server/db-repos/orgs.repo";
import { SessionsRepo } from "@/server/db-repos/sessions.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";
import { UsersRepo } from "@/server/db-repos/users.repo";
import { withTx } from "@db";
import { authEventEmitter } from "@/server/logging/auth-event-emitter";

const txRunner = { withTx };

function buildPepperConfig(): PepperConfig {
  const legacy = (env.TOKEN_PEPPER_LEGACY ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    active: env.TOKEN_PEPPER,
    legacy,
  };
}

export function createSessionService() {
  return new SessionService(
    new SessionsRepo(),
    buildPepperConfig(),
    txRunner,
    authEventEmitter,
  );
}

export function createEmailTokenService() {
  return new EmailTokenService(
    new EmailTokensRepo(),
    buildPepperConfig(),
    authEventEmitter,
  );
}

export function createSignupFlow() {
  return new SignupFlow(
    new UsersRepo(),
    new OrgsRepo(),
    new MembershipsRepo(),
    new SubscriptionsRepo(),
    txRunner,
  );
}

export function createLoginFlow() {
  return new LoginFlow(new UsersRepo(), authEventEmitter, buildPepperConfig());
}

export function createMagicLoginFlow() {
  return new MagicLoginFlow(createEmailTokenService(), new UsersRepo(), txRunner);
}

export function createPasswordResetFlow() {
  return new PasswordResetFlow(
    new UsersRepo(),
    createEmailTokenService(),
    createSessionService(),
    txRunner,
    authEventEmitter,
  );
}

export function createOAuthStateService() {
  return new OAuthStateService(new OAuthStatesRepo(), buildPepperConfig());
}

export function createOAuthLoginFlow() {
  return new OAuthLoginFlow(new UsersRepo(), new OAuthAccountsRepo(), authEventEmitter);
}

export function createVerifyEmailFlow() {
  return new VerifyEmailFlow(
    createEmailTokenService(),
    new UsersRepo(),
    txRunner,
    authEventEmitter,
  );
}
