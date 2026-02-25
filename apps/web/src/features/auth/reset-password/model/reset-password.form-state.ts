export type ResetPasswordFormState = {
  error: string | null;
  fieldErrors?: {
    password?: string[];
    confirmPassword?: string[];
  };
};

export const resetPasswordInitialState: ResetPasswordFormState = {
  error: null,
  fieldErrors: {},
};
