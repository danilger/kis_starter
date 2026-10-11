import "./setup";
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../src/server/db";
import { refreshTokens, users } from "../src/server/modules/auth/auth.table";
import { AuthError, login, refresh, register } from "../src/server/modules/auth/auth.service";

beforeAll(() => {
  migrate(db, { migrationsFolder: "./src/server/db/migrations" });
});

beforeEach(async () => {
  await db.delete(refreshTokens);
  await db.delete(users);
});

describe("auth.service", () => {
  test("register and login return session with refresh for cookie layer", async () => {
    const registered = await register({
      email: "alice@example.com",
      password: "password123",
    });

    expect(registered.user.email).toBe("alice@example.com");
    expect(registered.accessToken.length).toBeGreaterThan(10);
    expect(registered.refreshToken.length).toBeGreaterThan(10);

    const loggedIn = await login({
      email: "alice@example.com",
      password: "password123",
    });

    expect(loggedIn.user.id).toBe(registered.user.id);
  });

  test("refresh rotation invalidates previous token", async () => {
    const registered = await register({
      email: "rotate@example.com",
      password: "password123",
    });

    const next = await refresh(registered.refreshToken);
    expect(next.accessToken.length).toBeGreaterThan(10);
    expect(next.refreshToken).not.toBe(registered.refreshToken);

    try {
      await refresh(registered.refreshToken);
      throw new Error("expected AuthError");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("INVALID_REFRESH");
    }
  });

  test("duplicate email is rejected", async () => {
    await register({ email: "bob@example.com", password: "password123" });

    try {
      await register({ email: "bob@example.com", password: "password123" });
      throw new Error("expected AuthError");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("EMAIL_TAKEN");
      expect((error as AuthError).status).toBe(409);
    }
  });

  test("invalid password is rejected", async () => {
    await register({ email: "carol@example.com", password: "password123" });

    try {
      await login({ email: "carol@example.com", password: "wrong-password" });
      throw new Error("expected AuthError");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).code).toBe("INVALID_CREDENTIALS");
    }
  });
});
