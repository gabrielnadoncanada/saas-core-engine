import { routes } from "@/shared/constants/routes";

export function getLoginRedirectFromSignup(redirectParam: string | null) {
  return redirectParam
    ? `${routes.auth.login}?redirect=${encodeURIComponent(redirectParam)}`
    : routes.auth.login;
}
