const REFRESH_KEY = "foundation.refreshToken";
const ACCESS_KEY = "foundation.accessToken";

let accessTokenMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenMemory ?? localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setSession(tokens: { accessToken: string; refreshToken: string }): void {
  accessTokenMemory = tokens.accessToken;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearSession(): void {
  accessTokenMemory = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
