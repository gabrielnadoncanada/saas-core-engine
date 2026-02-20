import {
  login,
  requestMagicLink,
  requestPasswordReset,
  resetPassword,
  signup,
} from "@/features/auth/lib";

export async function loginWithPassword(params: { email: string; password: string }) {
  return login(params.email, params.password);
}

export async function signupWithWorkspace(params: {
  orgName: string;
  email: string;
  password: string;
}) {
  return signup(params.email, params.password, params.orgName);
}

export async function sendMagicLink(params: { email: string }) {
  return requestMagicLink(params.email);
}

export async function sendPasswordResetLink(params: { email: string }) {
  return requestPasswordReset(params.email);
}

export async function resetUserPassword(params: { token: string; newPassword: string }) {
  return resetPassword(params.token, params.newPassword);
}
