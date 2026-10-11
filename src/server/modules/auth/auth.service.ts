import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db";
import { refreshTokens, users } from "./auth.table";
import { hashPassword, verifyPassword } from "../../lib/password";
import { createRefreshToken, signAccessToken, verifyAccessToken } from "../../lib/tokens";
import type { LoginBody, RegisterBody, TokenPair, UserResponse } from "./contract/schema";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 401 | 409 = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toUserResponse(row: { id: string; email: string; createdAt: Date }): UserResponse {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

async function issueTokenPair(user: {
  id: string;
  email: string;
  createdAt: Date;
}): Promise<TokenPair> {
  const accessToken = await signAccessToken({ sub: user.id, email: user.email });
  const refresh = createRefreshToken();

  await db.insert(refreshTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashRefreshToken(refresh.token),
    expiresAt: refresh.expiresAt,
    createdAt: new Date(),
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    user: toUserResponse(user),
  };
}

export async function register(input: RegisterBody): Promise<TokenPair> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (existing) {
    throw new AuthError("Email already registered", "EMAIL_TAKEN", 409);
  }

  const now = new Date();
  const user = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    createdAt: now,
  };

  await db.insert(users).values(user);
  return issueTokenPair(user);
}

export async function login(input: LoginBody): Promise<TokenPair> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (!user) {
    throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  return issueTokenPair(user);
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();

  const stored = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, now)),
  });
  if (!stored) {
    throw new AuthError("Invalid or expired refresh token", "INVALID_REFRESH", 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, stored.userId),
  });
  if (!user) {
    throw new AuthError("User not found", "USER_NOT_FOUND", 401);
  }

  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
  return issueTokenPair(user);
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function me(accessToken: string): Promise<UserResponse> {
  let payload;
  try {
    payload = await verifyAccessToken(accessToken);
  } catch {
    throw new AuthError("Invalid or expired access token", "INVALID_ACCESS", 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });
  if (!user) {
    throw new AuthError("User not found", "USER_NOT_FOUND", 401);
  }

  return toUserResponse(user);
}
