import { OrgCoreError } from "@org-core";
import { RbacForbiddenError } from "@rbac-core";

export function orgErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (error instanceof OrgCoreError) return error.message;
  if (error instanceof RbacForbiddenError)
    return "You don't have permission for this action.";
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return "Unauthorized.";
  if (error instanceof Error && error.message === "NO_ORG")
    return "No organization selected.";
  if (error instanceof Error && error.message === "FORBIDDEN")
    return "Forbidden.";
  return fallback;
}
