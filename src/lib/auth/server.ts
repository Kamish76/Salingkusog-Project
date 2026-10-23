import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  "https://ep-damp-snow-b5y6ydzx.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";
const secret = process.env.NEON_AUTH_COOKIE_SECRET || "12345678901234567890123456789012";

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
  },
  logLevel: "error",
});
