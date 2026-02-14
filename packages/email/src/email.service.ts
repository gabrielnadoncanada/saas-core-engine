import type { EmailProvider } from "./provider.types";
import { magicLinkEmail } from "./templates/magic-link";
import { resetPasswordEmail } from "./templates/reset-password";
import { verifyEmailEmail } from "./templates/verify-email";

export class EmailService {
  constructor(
    private readonly provider: EmailProvider,
    private readonly config: { appName: string; from: string },
  ) {}

  async sendMagicLink(to: string, url: string): Promise<void> {
    const { subject, html } = magicLinkEmail({
      appName: this.config.appName,
      url,
    });
    await this.provider.send({ to, from: this.config.from, subject, html });
  }

  async sendResetPassword(to: string, url: string): Promise<void> {
    const { subject, html } = resetPasswordEmail({
      appName: this.config.appName,
      url,
    });
    await this.provider.send({ to, from: this.config.from, subject, html });
  }

  async sendVerifyEmail(to: string, url: string): Promise<void> {
    const { subject, html } = verifyEmailEmail({
      appName: this.config.appName,
      url,
    });
    await this.provider.send({ to, from: this.config.from, subject, html });
  }
}
