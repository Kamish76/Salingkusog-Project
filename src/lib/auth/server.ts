import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const secret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!secret) {
  throw new Error("Missing required environment variable: NEON_AUTH_COOKIE_SECRET");
}

if (!baseUrl) {
  throw new Error("Missing required environment variable: NEON_AUTH_BASE_URL");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
  logLevel: "error",
});
