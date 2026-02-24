import { INVITED_WORKSPACE_NAME, type SignupFormValues } from "@/features/auth/signup/model/signup-schema";

type BuildSignupPayloadParams = {
  values: SignupFormValues;
  inviteToken: string | null;
  inviteEmail: string | null;
  inviteReady: boolean;
};

export function isInvitedSignup(params: {
  inviteToken: string | null;
  inviteEmail: string | null;
  inviteReady: boolean;
}) {
  return Boolean(params.inviteToken && params.inviteEmail && params.inviteReady);
}

export function buildSignupPayload({
  values,
  inviteToken,
  inviteEmail,
  inviteReady,
}: BuildSignupPayloadParams) {
  const invitedSignup = isInvitedSignup({ inviteToken, inviteEmail, inviteReady });

  return {
    orgName: invitedSignup ? INVITED_WORKSPACE_NAME : values.orgName,
    email: values.email,
    password: values.password,
    inviteToken: invitedSignup ? inviteToken ?? undefined : undefined,
  };
}
