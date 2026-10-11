import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.string().datetime(),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userResponseSchema,
});

export const logoutOkSchema = z.object({
  ok: z.literal(true),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
