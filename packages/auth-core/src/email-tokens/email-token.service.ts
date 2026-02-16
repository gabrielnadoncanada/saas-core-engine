import { hashToken } from "../hashing/token";
import { randomTokenBase64Url } from "../hashing/random";
import type {
  ConsumeEmailTokenInput,
  ConsumedEmailToken,
  IssueEmailTokenInput,
  IssueEmailTokenResult,
} from "./email-token.types";
import type { EmailTokenRepo } from "../auth.ports";
import type { AuthEventEmitter } from "../events";
import { noOpAuthEventEmitter } from "../events";

export class EmailTokenService {
  constructor(
    private readonly repo: EmailTokenRepo,
    private readonly pepper: string,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  async issue(input: IssueEmailTokenInput): Promise<IssueEmailTokenResult> {
    const token = randomTokenBase64Url(32);
    const tokenHash = hashToken(token, this.pepper);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60 * 1000);

    const created = await this.repo.create({
      email: input.email,
      userId: input.userId ?? null,
      type: input.type,
      tokenHash,
      expiresAt,
    });
    await this.events.emit({
      type: "auth.token.issued",
      tokenType: input.type,
      tokenId: created.id,
      at: now,
    });

    return { token, expiresAt };
  }

  async consume(
    input: ConsumeEmailTokenInput,
    tx?: any,
  ): Promise<ConsumedEmailToken | null> {
    const tokenHash = hashToken(input.token, this.pepper);
    const record = await this.repo.findValidByTokenHash(tokenHash, tx);
    if (!record) return null;

    const marked = await this.repo.markUsedIfUnused(record.id, tx);
    if (!marked) return null;
    await this.events.emit({
      type: "auth.token.consumed",
      tokenType: record.type,
      tokenId: record.id,
      at: new Date(),
    });

    return {
      id: record.id,
      email: record.email,
      userId: record.userId ?? null,
      type: record.type,
    };
  }
}
