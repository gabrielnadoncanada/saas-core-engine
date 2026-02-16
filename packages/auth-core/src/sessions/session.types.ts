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
  idleTimeoutMinutes?: number;
};

export type ValidSession = {
  sessionId: string;
  userId: string;
};

export type RotateSessionInput = {
  sessionToken: string;
  ttlDays: number;
  ip?: string | null;
  userAgent?: string | null;
};

export type RotateSessionResult = CreateSessionResult & {
  userId: string;
  previousSessionId: string;
};
