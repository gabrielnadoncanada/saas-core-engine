export type ProfileEmailFieldErrors = {
  email?: string[];
};

export type ProfileEmailFormState = {
  error: string | null;
  success: string | null;
  fieldErrors?: ProfileEmailFieldErrors;
  email?: string;
  pendingEmail?: string | null;
};

export const profileEmailInitialState: ProfileEmailFormState = {
  error: null,
  success: null,
  fieldErrors: {},
  email: undefined,
  pendingEmail: undefined,
};
