"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { Value as PhoneValue } from "react-phone-number-input";

import { updateProfileAction } from "../api/update-profile.action";
import { profileInitialState } from "../model/profile-form-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { PhoneInput } from "@/shared/components/forms/phone-input";
import { Input } from "@/shared/components/ui/input";

type ProfileFormProps = {
  initialData: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    phoneNumber: string;
  };
};

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, profileInitialState);
  const [username, setUsername] = useState(initialData.username);
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialData.avatarUrl || null);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
    };
  }, [avatarObjectUrl]);

  const initials = useMemo(() => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      return initialData.email.slice(0, 2).toUpperCase();
    }

    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [firstName, lastName, initialData.email]);

  return (
    <form action={formAction} className="grid gap-4" encType="multipart/form-data">
      <input
        ref={avatarInputRef}
        id="profile-avatar-file"
        name="avatarFile"
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          if (avatarObjectUrl) {
            URL.revokeObjectURL(avatarObjectUrl);
          }

          const nextObjectUrl = URL.createObjectURL(file);
          setAvatarObjectUrl(nextObjectUrl);
          setAvatarPreviewUrl(nextObjectUrl);
        }}
      />
      <input type="hidden" name="phoneNumber" value={phoneNumber} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Upload avatar image"
        >
          <Avatar className="h-14 w-14 border">
            {avatarPreviewUrl ? <AvatarImage src={avatarPreviewUrl} alt="Avatar preview" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
        <div>
          <p className="text-sm text-muted-foreground">Click avatar to upload JPG, PNG, or WEBP (max 3MB).</p>
          <FieldError>{fieldErrors.avatarFile?.[0]}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={fieldErrors.username?.length ? true : undefined}>
          <FieldLabel htmlFor="profile-username">Username</FieldLabel>
          <Input
            id="profile-username"
            name="username"
            autoComplete="username"
            placeholder="your.username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            aria-invalid={fieldErrors.username?.length ? true : undefined}
            maxLength={32}
          />
          <FieldError>{fieldErrors.username?.[0]}</FieldError>
        </Field>

        <Field data-invalid={fieldErrors.firstName?.length ? true : undefined}>
          <FieldLabel htmlFor="profile-first-name">First name</FieldLabel>
          <Input
            id="profile-first-name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            aria-invalid={fieldErrors.firstName?.length ? true : undefined}
            maxLength={80}
          />
          <FieldError>{fieldErrors.firstName?.[0]}</FieldError>
        </Field>

        <Field data-invalid={fieldErrors.lastName?.length ? true : undefined}>
          <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
          <Input
            id="profile-last-name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            aria-invalid={fieldErrors.lastName?.length ? true : undefined}
            maxLength={80}
          />
          <FieldError>{fieldErrors.lastName?.[0]}</FieldError>
        </Field>
      </div>

      <Field data-invalid={fieldErrors.phoneNumber?.length ? true : undefined}>
        <FieldLabel htmlFor="profile-phone-number">Phone number</FieldLabel>
        <PhoneInput
          id="profile-phone-number"
          autoComplete="tel"
          placeholder="+1 555 123 4567"
          value={phoneNumber as PhoneValue}
          onChange={(value) => setPhoneNumber((value ?? "") as string)}
          aria-invalid={fieldErrors.phoneNumber?.length ? true : undefined}
          maxLength={32}
        />
        <FieldError>{fieldErrors.phoneNumber?.[0]}</FieldError>
      </Field>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <Button disabled={pending} className="w-fit">
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        Save profile
      </Button>
    </form>
  );
}
