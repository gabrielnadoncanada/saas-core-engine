import "server-only";

import { EmailService } from "@email";
import { Resend } from "resend";

import type { EmailProvider, SendEmailInput } from "@email";

import { env } from "@/server/config/env";

class ResendProvider implements EmailProvider {
  private readonly client: Resend | null;

  constructor(apiKey?: string) {
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.client) {
      if (env.NODE_ENV === "production") {
        throw new Error("email_provider_not_configured");
      }
      console.warn("[EMAIL DEV MODE]", {
        to: input.to,
        subject: input.subject,
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
