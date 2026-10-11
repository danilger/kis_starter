let accessTokenMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function setAccessToken(accessToken: string): void {
  accessTokenMemory = accessToken;
}

export function clearSession(): void {
  accessTokenMemory = null;
}
