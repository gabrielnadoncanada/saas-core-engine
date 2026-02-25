export type ForgotPasswordFormState = {
  error: string | null;
  success: string | null;
};

export const forgotPasswordInitialState: ForgotPasswordFormState = {
  error: null,
  success: null,
};
