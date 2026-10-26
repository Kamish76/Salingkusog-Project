import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  "https://placeholder.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";
const secret =
  process.env.NEON_AUTH_COOKIE_SECRET ||
  "placeholder_build_cookie_secret_minimum_32_characters_long";

if (!process.env.NEON_AUTH_COOKIE_SECRET && process.env.NODE_ENV === "production" && !process.env.CI) {
  throw new Error("FATAL: NEON_AUTH_COOKIE_SECRET must be configured in production environments.");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
  logLevel: "error",
});
