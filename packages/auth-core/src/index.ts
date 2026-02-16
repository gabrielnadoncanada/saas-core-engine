export { hashPassword, verifyPassword } from "./hashing/password";
export { hashToken } from "./hashing/token";

export type {
  EmailTokenRepo,
  OAuthAccountsRepo,
  OAuthStatesRepo,
  SessionsRepo,
  TxRunner,
  UsersRepo,
} from "./auth.ports";

export { SessionService } from "./sessions/session.service";
export type {
  CreateSessionInput,
  CreateSessionResult,
  RotateSessionInput,
  RotateSessionResult,
  ValidateSessionInput,
  ValidSession,
} from "./sessions/session.types";

export { EmailTokenService } from "./email-tokens/email-token.service";
export { AuthCoreError, authErr } from "./errors";
export type { AuthEvent, AuthEventEmitter } from "./events";

export { SignupFlow } from "./flows/signup.flow";
export { LoginFlow } from "./flows/login.flow";
export { MagicLoginFlow } from "./flows/magic-login.flow";
export { PasswordResetFlow } from "./flows/password-reset.flow";
export { OAuthLoginFlow } from "./flows/oauth-login.flow";
export { OAuthStateService } from "./oauth/state.service";
export { codeChallengeS256, oidcNonceFromCodeVerifier } from "./oauth/pkce";
export { GoogleProvider } from "./oauth/providers/google";
export type {
  GoogleIdTokenClaims,
  GoogleTokenExchangeParams,
} from "./oauth/providers/google";
export { VerifyEmailFlow } from "./flows/verify-email.flow";
