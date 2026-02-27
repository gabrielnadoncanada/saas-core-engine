"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { cancelProfileEmailChangeAction } from "../api/cancel-profile-email-change.action";
import { resendProfileEmailConfirmationAction } from "../api/resend-profile-email-confirmation.action";
import { updateProfileEmailAction } from "../api/update-profile-email.action";
import { profileEmailInitialState } from "../model/profile-email-form-state";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

type ProfileEmailFormProps = {
  currentEmail: string;
  pendingEmail: string | null;
  emailVerified: boolean;
  emailChangeStatus?: string;
};

export function ProfileEmailForm({
  currentEmail,
  pendingEmail: initialPendingEmail,
  emailVerified,
  emailChangeStatus,
}: ProfileEmailFormProps) {
  const router = useRouter();
  const [requestState, requestAction, requestPending] = useActionState(
    updateProfileEmailAction,
    profileEmailInitialState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendProfileEmailConfirmationAction,
    profileEmailInitialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelProfileEmailChangeAction,
    profileEmailInitialState,
  );
  const [currentEmailState, setCurrentEmailState] = useState(currentEmail);
  const [pendingEmailState, setPendingEmailState] = useState<string | null>(initialPendingEmail);
  const [emailInput, setEmailInput] = useState(initialPendingEmail ?? currentEmail);
  const fieldErrors = requestState.fieldErrors ?? {};

  const statusFeedback = useMemo(() => {
    if (emailChangeStatus === "verified") return "Email changed and verified successfully.";
    if (emailChangeStatus === "expired") return "This confirmation link is invalid or expired.";
    if (emailChangeStatus === "missing_token") return "Verification link is missing.";
    return null;
  }, [emailChangeStatus]);

  const activeFeedbackState = useMemo(() => {
    if (requestState.error || requestState.success) return requestState;
    if (resendState.error || resendState.success) return resendState;
    if (cancelState.error || cancelState.success) return cancelState;
    return profileEmailInitialState;
  }, [requestState, resendState, cancelState]);

  useEffect(() => {
    if (requestState.email !== undefined) {
      setCurrentEmailState(requestState.email);
    }
    if (requestState.pendingEmail !== undefined) {
      setPendingEmailState(requestState.pendingEmail ?? null);
      setEmailInput(requestState.pendingEmail ?? requestState.email ?? currentEmailState);
    }
  }, [requestState.email, requestState.pendingEmail, currentEmailState]);

  useEffect(() => {
    if (requestState.success || resendState.success || cancelState.success) {
      router.refresh();
    }
  }, [router, requestState.success, resendState.success, cancelState.success]);

  return (
    <div className="grid gap-3">
      <form action={requestAction} className="grid gap-3">
        <Field data-invalid={fieldErrors.email?.length ? true : undefined}>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            aria-invalid={fieldErrors.email?.length ? true : undefined}
            required
          />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </Field>

        <p className="text-xs text-muted-foreground">
          {pendingEmailState
            ? `Pending change: ${pendingEmailState}. Confirm from your inbox to switch emails.`
            : emailVerified
              ? "Your email is verified."
              : "Email verification pending."}
        </p>

        {activeFeedbackState.error ? (
          <p className="text-sm text-red-600">{activeFeedbackState.error}</p>
        ) : null}
        {activeFeedbackState.success ? (
          <p className="text-sm text-emerald-600">{activeFeedbackState.success}</p>
        ) : null}
        {statusFeedback && !activeFeedbackState.error && !activeFeedbackState.success ? (
          <p
            className={`text-sm ${
              emailChangeStatus === "verified" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {statusFeedback}
          </p>
        ) : null}

        <Button type="submit" disabled={requestPending || !emailInput.trim()} className="w-fit">
          {requestPending ? <Loader2 className="animate-spin" /> : "Send confirmation"}
        </Button>
      </form>

      {pendingEmailState ? (
        <div className="flex flex-wrap gap-2">
          <form action={resendAction}>
            <Button type="submit" variant="outline" disabled={resendPending}>
              {resendPending ? <Loader2 className="animate-spin" /> : "Resend confirmation"}
            </Button>
          </form>
          <form action={cancelAction}>
            <Button type="submit" variant="destructive" disabled={cancelPending}>
              {cancelPending ? <Loader2 className="animate-spin" /> : "Cancel request"}
            </Button>
          </form>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">Current email: {currentEmailState}</p>
    </div>
  );
}
