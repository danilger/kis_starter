export const TEST_ORIGIN = "http://localhost:5173";

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Origin: TEST_ORIGIN,
    ...extra,
  };
}

export function cookieFromResponse(res: Response, name: string): string | null {
  const headers =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((v): v is string => Boolean(v));

  for (const header of headers) {
    const match = header.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
