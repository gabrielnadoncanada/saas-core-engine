import { hashIdentifier, hashTokenCandidates, type PepperInput } from "../hashing/token";
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
    private readonly pepper: PepperInput,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  private resolveTtlMinutes(type: IssueEmailTokenInput["type"], ttlMinutes: number): number {
    if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
      throw new Error("ttlMinutes must be a positive number");
    }

    const maxByType: Record<IssueEmailTokenInput["type"], number> = {
      magic_login: 20,
      password_reset: 20,
      verify_email: 24 * 60,
    };

    return Math.min(Math.floor(ttlMinutes), maxByType[type]);
  }

  async issue(input: IssueEmailTokenInput): Promise<IssueEmailTokenResult> {
    const token = randomTokenBase64Url(32);
    const tokenHash = hashIdentifier(token, this.pepper);
    const ttlMinutes = this.resolveTtlMinutes(input.type, input.ttlMinutes);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

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
    for (const tokenHash of hashTokenCandidates(input.token, this.pepper)) {
      const record = await this.repo.findValidByTokenHash(tokenHash, tx);
      if (!record) continue;

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

    return null;
  }
}
