export class AIEnforcementError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AIEnforcementError";
  }
}

