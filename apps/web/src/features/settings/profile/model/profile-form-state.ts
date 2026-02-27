export type ProfileFieldErrors = {
  username?: string[];
  firstName?: string[];
  lastName?: string[];
  avatarFile?: string[];
  phoneNumber?: string[];
};

export type ProfileFormState = {
  error: string | null;
  success: string | null;
  fieldErrors?: ProfileFieldErrors;
};

export const profileInitialState: ProfileFormState = {
  error: null,
  success: null,
  fieldErrors: {},
};
