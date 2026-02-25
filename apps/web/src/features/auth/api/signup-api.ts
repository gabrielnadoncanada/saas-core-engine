import { signup } from "../lib/auth-client";

export async function signupWithWorkspace(params: {
  orgName: string;
  email: string;
  password: string;
  inviteToken?: string;
}) {
  return signup(params.email, params.password, params.orgName, params.inviteToken);
}
