import {
  EmailTokenService,
  LoginFlow,
  MagicLoginFlow,
  OAuthLoginFlow,
  OAuthStateService,
  PasswordResetFlow,
  SessionContextService,
  SessionService,
  SignupFlow,
  VerifyEmailFlow,
  VerifyEmailRequestFlow,
} from "@auth-core";
import { withTx } from "@db";

import { env } from "@/server/config/env";
import { EmailTokensRepo } from "@/server/db-repos/email-tokens.repo";
import { MembershipsRepo } from "@/server/db-repos/memberships.repo";
import { OAuthAccountsRepo } from "@/server/db-repos/oauth-accounts.repo";
import { OAuthStatesRepo } from "@/server/db-repos/oauth-states.repo";
import { OrgsRepo } from "@/server/db-repos/orgs.repo";
import { SessionsRepo } from "@/server/db-repos/sessions.repo";
import { SubscriptionsRepo } from "@/server/db-repos/subscriptions.repo";
import { UsersRepo } from "@/server/db-repos/users.repo";
import { authEventEmitter } from "@/server/logging/auth-event-emitter";

const txRunner = { withTx };

export function createSessionService() {
  return new SessionService(
    new SessionsRepo(),
    env.TOKEN_PEPPER,
    txRunner,
    authEventEmitter,
  );
}

export function createEmailTokenService() {
  return new EmailTokenService(
    new EmailTokensRepo(),
    env.TOKEN_PEPPER,
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
  return new LoginFlow(new UsersRepo(), authEventEmitter, env.TOKEN_PEPPER);
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
  return new OAuthStateService(new OAuthStatesRepo(), env.TOKEN_PEPPER);
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

export function createVerifyEmailRequestFlow() {
  return new VerifyEmailRequestFlow(new UsersRepo(), createVerifyEmailFlow());
}

export function createSessionContextService() {
  return new SessionContextService(
    createSessionService(),
    new UsersRepo(),
    new MembershipsRepo(),
  );
}
