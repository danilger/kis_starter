/** Public API of the auth module. Prefer these exports over deep imports. */
export { authRoutes } from "./auth.routes";
export { allowedOrigins } from "./auth.csrf";
export type { UserResponse, AuthSession } from "./contract/schema";
