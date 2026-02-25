export type InviteSignupErrorCode =
  | "invalid_invite"
  | "invite_expired"
  | "invite_already_accepted"
  | "invite_email_mismatch";

export class InviteSignupError extends Error {
  constructor(public code: InviteSignupErrorCode) {
    super(code);
    this.name = "InviteSignupError";
  }
}

export function inviteSignupErrorMessage(code: InviteSignupErrorCode): string {
  switch (code) {
    case "invalid_invite":
    case "invite_expired":
      return "Invitation is invalid or expired.";
    case "invite_already_accepted":
      return "This invitation has already been used.";
    case "invite_email_mismatch":
      return "This invitation was issued for a different email address.";
  }
}
