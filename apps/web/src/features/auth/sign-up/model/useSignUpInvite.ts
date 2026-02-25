"use client";

import { useEffect, useState } from "react";

import { getInviteEmailByTokenAction } from "@/features/auth/sign-up/api/signup-invite.action";
import type { InviteLookupState } from "@/features/auth/sign-up/model/sign-up.schema";

type UseSignupInviteParams = {
  inviteToken: string | null;
};

const DEFAULT_INVITE_ERROR = "Invitation is invalid or expired.";

export function useSignupInvite({ inviteToken }: UseSignupInviteParams) {
  const [inviteState, setInviteState] = useState<InviteLookupState>(
    inviteToken ? "loading" : "idle",
  );
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setInviteState("idle");
      setInviteEmail(null);
      setInviteError(null);
      return;
    }

    let disposed = false;

    async function loadInvite(token: string) {
      setInviteState("loading");
      setInviteError(null);

      try {
        const res = await getInviteEmailByTokenAction(token);
        if (disposed) return;

        if (!res.ok) {
          setInviteState("error");
          setInviteEmail(null);
          setInviteError(res.error || DEFAULT_INVITE_ERROR);
          return;
        }

        setInviteEmail(res.data.email);
        setInviteState("ready");
      } catch {
        if (disposed) return;
        setInviteState("error");
        setInviteEmail(null);
        setInviteError(DEFAULT_INVITE_ERROR);
      }
    }

    void loadInvite(inviteToken);

    return () => {
      disposed = true;
    };
  }, [inviteToken]);

  const isInvited = inviteState === "ready";

  return {
    inviteState,
    inviteEmail,
    inviteError,
    isInvited,
    // Block only while checking the token.
    inviteBlocked: Boolean(inviteToken && inviteState === "loading"),
  };
}
