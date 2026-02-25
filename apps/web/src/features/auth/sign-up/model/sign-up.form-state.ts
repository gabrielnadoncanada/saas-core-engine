export type SignupFieldErrors = {
  orgName?: string[];
  email?: string[];
  password?: string[];
  passwordConfirm?: string[];
};

export type SignupFormState = {
  error: string | null;
  fieldErrors?: SignupFieldErrors;
};

export const signupInitialState: SignupFormState = { error: null, fieldErrors: {} };
