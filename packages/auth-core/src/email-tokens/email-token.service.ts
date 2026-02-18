import { hashIdentifier, type PepperInput } from "../hashing/token";
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
import { findByTokenCandidates } from "../utils/token-candidates";
import { clampPositiveTtlMinutes } from "../utils/ttl";

export class EmailTokenService {
  constructor(
    private readonly repo: EmailTokenRepo,
    private readonly pepper: PepperInput,
    private readonly events: AuthEventEmitter = noOpAuthEventEmitter,
  ) {}

  private resolveTtlMinutes(type: IssueEmailTokenInput["type"], ttlMinutes: number): number {
    const maxByType: Record<IssueEmailTokenInput["type"], number> = {
      magic_login: 20,
      password_reset: 20,
      verify_email: 24 * 60,
    };

    return clampPositiveTtlMinutes(ttlMinutes, maxByType[type]);
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
    const record = await findByTokenCandidates(input.token, this.pepper, (tokenHash) =>
      this.repo.findValidByTokenHash(tokenHash, tx),
    );
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
