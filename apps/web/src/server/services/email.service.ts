import "server-only";

import { Resend } from "resend";
import type { EmailProvider, SendEmailInput } from "@email";
import { EmailService } from "@email";
import { env } from "@/server/config/env";

class ResendProvider implements EmailProvider {
  private readonly client: Resend | null;

  constructor(apiKey?: string) {
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    // Dev fallback: log email if not configured
    if (!this.client) {
      // eslint-disable-next-line no-console
      console.warn("[EMAIL DEV MODE]", {
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      return;
    }

    const res = await this.client.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (res.error) throw new Error(res.error.message);
  }
}

export function getEmailService(): EmailService {
  const provider = new ResendProvider(env.RESEND_API_KEY);
  return new EmailService(provider, {
    appName: env.APP_NAME,
    from: env.EMAIL_FROM,
  });
}
