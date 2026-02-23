export {
  getDummyPasswordHash,
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "./hashing/password";
export {
  hashIdentifier,
  hashToken,
} from "./hashing/token";
export type { PepperInput } from "./hashing/token";

export type {
  OAuthStateRecord,
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
export { isUniqueConstraintViolation } from "./errors";
export type { AuthEvent, AuthEventEmitter } from "./events";

export { SignupFlow } from "./flows/signup.flow";
export { LoginFlow } from "./flows/login.flow";
export { MagicLoginFlow } from "./flows/magic-login.flow";
export { PasswordResetFlow } from "./flows/password-reset.flow";
export { OAuthLoginFlow } from "./flows/oauth-login.flow";
export { OAuthStateService } from "./oauth/state.service";
export { codeChallengeS256, oidcNonceFromCodeVerifier } from "./oauth/pkce";
export { safeRedirectPath } from "./oauth/safe-redirect";
export { GoogleProvider } from "./oauth/providers/google";
export type {
  GoogleIdTokenClaims,
  GoogleTokenExchangeParams,
} from "./oauth/providers/google";
export { GitHubProvider } from "./oauth/providers/github";
export type {
  GitHubTokenExchangeParams,
  GitHubUserClaims,
} from "./oauth/providers/github";
export { VerifyEmailFlow } from "./flows/verify-email.flow";
export { VerifyEmailRequestFlow } from "./flows/verify-email-request.flow";
export { buildAuthRateLimitKey } from "./rate-limit";
export type { AuthRateLimitRoute } from "./rate-limit";
export type {
  ResolveSessionContextParams,
  SessionContextMembershipsRepo,
  SessionContextResult,
  SessionContextUsersRepo,
} from "./session-context/session-context.service";
export { SessionContextService } from "./session-context/session-context.service";
