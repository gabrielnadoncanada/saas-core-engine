import type { EmailTokenType } from "@contracts";

export type IssueEmailTokenInput = {
  email: string;
  userId?: string | null;
  type: EmailTokenType;
  ttlMinutes: number;
};

export type IssueEmailTokenResult = {
  token: string;
  expiresAt: Date;
};

export type ConsumeEmailTokenInput = {
  token: string;
};

export type ConsumedEmailToken = {
  id: string;
  email: string;
  userId: string | null;
  type: EmailTokenType;
};