import type { EmailProvider } from "./provider.types";
import { magicLinkEmail } from "./templates/magic-link";
import { orgInviteEmail } from "./templates/org-invite";
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

  async sendOrgInvite(
    to: string,
    url: string,
    organizationName?: string,
    inviterName?: string,
  ): Promise<void> {
    const { subject, html } = orgInviteEmail({
      appName: this.config.appName,
      url,
      organizationName,
      inviterName,
    });
    await this.provider.send({ to, from: this.config.from, subject, html });
  }
}
