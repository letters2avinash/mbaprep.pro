// Only allow redirects to a path on this site. Anything else (absolute
// URLs, protocol-relative "//host" and backslash tricks) falls back to "/".
export function safeNextPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
