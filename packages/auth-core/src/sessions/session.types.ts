export type CreateSessionInput = {
  userId: string;
  ttlDays: number;
  pepper: string;
  ip?: string | null;
  userAgent?: string | null;
};

export type CreateSessionResult = {
  sessionToken: string; // set in cookie by adapter
  expiresAt: Date;
};

export type ValidateSessionInput = {
  sessionToken: string;
  pepper: string;
};

export type ValidSession = {
  sessionId: string;
  userId: string;
};
