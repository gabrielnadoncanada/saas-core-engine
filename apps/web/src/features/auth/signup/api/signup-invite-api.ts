export async function getInviteEmailByToken(token: string) {
  const res = await fetch(`/api/org/invite/token?token=${encodeURIComponent(token)}`);
  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    invite?: { email: string };
  };

  if (!res.ok || !json.ok || !json.invite?.email) {
    throw new Error(json.error ?? "invalid_invite");
  }

  return json.invite.email;
}
