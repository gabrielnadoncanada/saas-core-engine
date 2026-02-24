"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { getInviteEmailByToken } from "@/features/auth/signup/api/signup-invite-api";
import {
  INVITED_WORKSPACE_NAME,
  type InviteLookupState,
  type SignupFormValues,
} from "@/features/auth/signup/model/signup-schema";

type UseSignupInviteParams = {
  inviteToken: string | null;
  form: UseFormReturn<SignupFormValues>;
};

export function useSignupInvite({ inviteToken, form }: UseSignupInviteParams) {
  const [inviteState, setInviteState] = useState<InviteLookupState>(inviteToken ? "loading" : "idle");
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setInviteState("idle");
      setInviteEmail(null);
      return;
    }
    const token: string = inviteToken;

    let disposed = false;

    async function loadInvite() {
      setInviteState("loading");
      try {
        const email = await getInviteEmailByToken(token);
        if (disposed) return;
        setInviteEmail(email);
        form.setValue("email", email, { shouldValidate: true });
        form.setValue("orgName", INVITED_WORKSPACE_NAME, { shouldValidate: true });
        setInviteState("ready");
      } catch {
        if (disposed) return;
        setInviteState("error");
        setInviteEmail(null);
      }
    }

    void loadInvite();

    return () => {
      disposed = true;
    };
  }, [inviteToken, form]);

  return {
    inviteState,
    inviteEmail,
    isInvited: Boolean(inviteToken && inviteEmail && inviteState === "ready"),
    inviteBlocked: Boolean(inviteToken && inviteState !== "ready"),
  };
}
