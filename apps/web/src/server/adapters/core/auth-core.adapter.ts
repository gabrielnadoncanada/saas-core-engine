import {
  EmailTokenService,
  LoginFlow,
  MagicLoginFlow,
  OAuthLoginFlow,
  OAuthStateService,
  PasswordResetFlow,
  SessionService,
  SignupFlow,
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

const txRunner = { withTx };

export function createSessionService() {
  return new SessionService(new SessionsRepo(), env.TOKEN_PEPPER);
}

export function createEmailTokenService() {
  return new EmailTokenService(new EmailTokensRepo(), env.TOKEN_PEPPER);
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
  return new LoginFlow(new UsersRepo());
}

export function createMagicLoginFlow() {
  return new MagicLoginFlow(createEmailTokenService(), new UsersRepo());
}

export function createPasswordResetFlow() {
  return new PasswordResetFlow(
    new UsersRepo(),
    createEmailTokenService(),
    createSessionService(),
  );
}

export function createOAuthStateService() {
  return new OAuthStateService(new OAuthStatesRepo(), env.TOKEN_PEPPER);
}

export function createOAuthLoginFlow() {
  return new OAuthLoginFlow(new UsersRepo(), new OAuthAccountsRepo());
}
