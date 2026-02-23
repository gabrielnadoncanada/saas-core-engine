export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Login failed");
  return json;
}

export async function signup(
  email: string,
  password: string,
  orgName: string,
  inviteToken?: string,
) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, orgName, inviteToken }),
  });

  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Signup failed");
  return json;
}

export async function requestPasswordReset(email: string) {
  const res = await fetch("/api/auth/password/forgot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to send reset link.");
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch("/api/auth/password/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Reset failed");
  return json;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}
