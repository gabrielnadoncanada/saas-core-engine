import type { EmailTokenType, OAuthProvider } from "@contracts";

export type AuthEvent =
  | { type: "auth.login.succeeded"; userId: string; at: Date }
  | { type: "auth.login.failed"; emailHash: string; at: Date }
  | { type: "auth.password_reset.requested"; userId: string; at: Date }
  | { type: "auth.password_reset.completed"; userId: string; at: Date }
  | { type: "auth.verify_email.requested"; userId: string; at: Date }
  | { type: "auth.oauth.linked"; userId: string; provider: OAuthProvider; at: Date }
  | { type: "auth.token.issued"; tokenType: EmailTokenType; tokenId: string; at: Date }
  | { type: "auth.token.consumed"; tokenType: EmailTokenType; tokenId: string; at: Date }
  | { type: "auth.session.created"; sessionId: string; userId: string; at: Date }
  | { type: "auth.session.revoked"; sessionId: string; at: Date };

export interface AuthEventEmitter {
  emit(event: AuthEvent): void | Promise<void>;
}

export const noOpAuthEventEmitter: AuthEventEmitter = {
  emit() {
    return;
  },
};
