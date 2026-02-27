export type ChangePasswordFieldErrors = {
  currentPassword?: string[];
  newPassword?: string[];
  confirmPassword?: string[];
};

export type ChangePasswordFormState = {
  error: string | null;
  success: string | null;
  fieldErrors?: ChangePasswordFieldErrors;
};

export const changePasswordInitialState: ChangePasswordFormState = {
  error: null,
  success: null,
  fieldErrors: {},
};
