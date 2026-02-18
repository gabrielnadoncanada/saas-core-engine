import { AIEnforcementError } from "./errors";
import { minuteWindowStart } from "./quota";

export interface AIRateLimitRepo {
  incrementOrgMinuteBucket(params: {
    organizationId: string;
    windowStart: Date;
  }): Promise<{ count: number; windowStart: Date }>;
}

export class AIRateLimitService {
  constructor(private readonly repo: AIRateLimitRepo) {}

  async enforceRpmOrThrow(orgId: string, rpm: number) {
    const windowStart = minuteWindowStart();
    const bucket = await this.repo.incrementOrgMinuteBucket({
      organizationId: orgId,
      windowStart,
    });

    if (bucket.count > rpm) {
      throw new AIEnforcementError("Rate limit exceeded. Please slow down.", 429, {
        rpm,
        windowStart: bucket.windowStart.toISOString(),
        count: bucket.count,
      });
    }

    return {
      rpm,
      windowStart: bucket.windowStart.toISOString(),
      count: bucket.count,
    };
  }
}

