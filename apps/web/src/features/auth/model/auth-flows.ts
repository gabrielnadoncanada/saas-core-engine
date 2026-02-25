import {
  login,
  requestPasswordReset,
  resetPassword,
} from "../lib/auth-client";

export async function loginWithPassword(params: { email: string; password: string }) {
  return login(params.email, params.password);
}

export async function sendPasswordResetLink(params: { email: string }) {
  return requestPasswordReset(params.email);
}

export async function resetUserPassword(params: { token: string; newPassword: string }) {
  return resetPassword(params.token, params.newPassword);
}
