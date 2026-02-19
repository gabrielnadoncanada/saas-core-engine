export function safeRedirectPath(input: string | null): string {
  if (!input) return "/dashboard";
  if (!input.startsWith("/")) return "/dashboard";
  if (input.startsWith("//")) return "/dashboard";
  if (input.includes("..")) return "/dashboard";
  if (input.includes("\\")) return "/dashboard";
  if (input.includes("http://") || input.includes("https://")) {
    return "/dashboard";
  }
  return input;
}
