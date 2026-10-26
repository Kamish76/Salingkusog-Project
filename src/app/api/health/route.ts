import { connection } from "next/server";
import { getCurrentUser, isDevAuthorized } from "@/lib/auth";
import { runAllHealthProbes } from "@/lib/health-probes";

export const instant = false;

export async function GET() {
  await connection();

  const user = await getCurrentUser();
  const isAuthorized = isDevAuthorized(user) || process.env.NODE_ENV !== "production";

  if (!isAuthorized) {
    return Response.json({ status: "ok" }, { status: 200 });
  }

  const diagnostics = await runAllHealthProbes();
  return Response.json(diagnostics, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
