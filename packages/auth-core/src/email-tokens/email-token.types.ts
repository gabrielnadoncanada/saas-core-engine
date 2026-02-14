import type { EmailTokenType } from "@prisma/client";

export type IssueEmailTokenInput = {
  email: string;
  userId?: string | null;
  type: EmailTokenType;
  ttlMinutes: number;
  pepper: string;
};

export type IssueEmailTokenResult = {
  token: string; // raw token to embed in link
  expiresAt: Date;
};

export type ConsumeEmailTokenInput = {
  token: string;
  pepper: string;
};

export type ConsumedEmailToken = {
  id: string;
  email: string;
  userId: string | null;
  type: EmailTokenType;
};
