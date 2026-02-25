export type ForgotPasswordFormState = {
  error: string | null;
  success: string | null;
  fieldErrors?: {
    email?: string[];
  };
};

export const forgotPasswordInitialState: ForgotPasswordFormState = {
  error: null,
  success: null,
  fieldErrors: {},
};
