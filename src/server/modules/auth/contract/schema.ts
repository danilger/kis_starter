import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.string().datetime(),
});

/** JSON session payload — refresh token is HttpOnly cookie only. */
export const authSessionSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export const logoutOkSchema = z.object({
  ok: z.literal(true),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
