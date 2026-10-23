import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL || "https://dummy.neonauth.tech/neondb/auth";
const secret = process.env.NEON_AUTH_COOKIE_SECRET || "12345678901234567890123456789012";

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
  logLevel: "error",
});
