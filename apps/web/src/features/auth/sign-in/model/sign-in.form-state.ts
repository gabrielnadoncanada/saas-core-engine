export type LoginFormState = {
  error: string | null;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export const loginInitialState: LoginFormState = { error: null, fieldErrors: {} };
