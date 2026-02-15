export type CreateSessionInput = {
  userId: string;
  ttlDays: number;
  ip?: string | null;
  userAgent?: string | null;
};

export type CreateSessionResult = {
  sessionToken: string;
  expiresAt: Date;
};

export type ValidateSessionInput = {
  sessionToken: string;
};

export type ValidSession = {
  sessionId: string;
  userId: string;
};