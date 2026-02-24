"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

type Props = {
  initialFirstName?: string | null;
  initialLastName?: string | null;
  initialAvatarUrl?: string | null;
  initialPhoneNumber?: string | null;
  accountEmail: string;
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  profile?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    phoneNumber: string | null;
  };
};

export function ProfileForm({
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
  initialPhoneNumber,
  accountEmail,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const initials = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return accountEmail.slice(0, 2).toUpperCase();
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("");
  }, [accountEmail, firstName, lastName]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          avatarUrl,
          phoneNumber,
        }),
      });

      const text = await res.text();
      const json = (text ? JSON.parse(text) : {}) as ApiResult;

      if (!res.ok) {
        if (json.error === "invalid_input") {
          setMsg("Invalid profile data.");
          return;
        }
        setMsg("Failed to update profile.");
        return;
      }

      setFirstName(json.profile?.firstName ?? "");
      setLastName(json.profile?.lastName ?? "");
      setAvatarUrl(json.profile?.avatarUrl ?? "");
      setPhoneNumber(json.profile?.phoneNumber ?? "");
      setMsg("Profile updated.");
      router.refresh();
    } catch {
      setMsg("Failed to update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar style={avatarBase}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar preview" /> : null}
          <AvatarFallback style={avatarFallback}>{initials}</AvatarFallback>
        </Avatar>
        <div style={{ fontSize: 12, color: "#666" }}>
          Avatar preview. Use a public image URL.
        </div>
      </div>

      <div style={grid}>
        <div>
          <div style={label}>First name</div>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            style={input}
            maxLength={80}
          />
        </div>

        <div>
          <div style={label}>Last name</div>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            style={input}
            maxLength={80}
          />
        </div>
      </div>

      <div style={grid}>
        <div>
          <div style={label}>Avatar URL</div>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            type="url"
            autoComplete="url"
            placeholder="https://..."
            style={input}
            maxLength={500}
          />
        </div>

        <div>
          <div style={label}>Phone number</div>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            style={input}
            maxLength={32}
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            void onSave();
          }}
          disabled={busy}
          style={button}
        >
          {busy ? "Saving..." : "Save profile"}
        </button>
      </div>

      {msg ? <div style={{ fontSize: 12, color: "#666" }}>{msg}</div> : null}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const label: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const button: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const avatarBase: React.CSSProperties = {
  width: 56,
  height: 56,
  border: "1px solid #ddd",
};

const avatarFallback: React.CSSProperties = {
  fontWeight: 700,
  color: "#666",
};
