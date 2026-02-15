import { hashToken } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";
import type {
  ConsumeEmailTokenInput,
  ConsumedEmailToken,
  IssueEmailTokenInput,
  IssueEmailTokenResult,
} from "./email-token.types";
import type { EmailTokenRepo } from "../auth.ports";

export class EmailTokenService {
  constructor(
    private readonly repo: EmailTokenRepo,
    private readonly pepper: string,
  ) {}

  async issue(input: IssueEmailTokenInput): Promise<IssueEmailTokenResult> {
    const token = randomTokenBase64Url(32);
    const tokenHash = hashToken(token, this.pepper);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60 * 1000);

    await this.repo.create({
      email: input.email,
      userId: input.userId ?? null,
      type: input.type,
      tokenHash,
      expiresAt,
    });

    return { token, expiresAt };
  }

  async consume(
    input: ConsumeEmailTokenInput,
  ): Promise<ConsumedEmailToken | null> {
    const tokenHash = hashToken(input.token, this.pepper);
    const record = await this.repo.findValidByTokenHash(tokenHash);
    if (!record) return null;

    await this.repo.markUsed(record.id);

    return {
      id: record.id,
      email: record.email,
      userId: record.userId ?? null,
      type: record.type,
    };
  }
}