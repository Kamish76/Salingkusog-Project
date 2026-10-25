import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  "https://placeholder.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";
const secret =
  process.env.NEON_AUTH_COOKIE_SECRET ||
  "placeholder_build_cookie_secret_minimum_32_characters_long";

if (!process.env.NEON_AUTH_COOKIE_SECRET && process.env.NODE_ENV === "production" && !process.env.CI) {
  console.warn("⚠️ NEON_AUTH_COOKIE_SECRET is not set in production.");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
  logLevel: "error",
});
