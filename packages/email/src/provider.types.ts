export type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
