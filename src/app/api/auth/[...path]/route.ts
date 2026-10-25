import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { recordActivityLog } from "@/lib/activity-logger";

const handler = auth.handler();

export const { POST, PUT, DELETE, PATCH } = handler;

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const response = await handler.GET(request, context);
  const { path } = await context.params;

  if (path && path.some((p) => p.includes("callback"))) {
    try {
      const { data: session } = await auth.getSession();
      if (session?.user?.id && process.env.DATABASE_URL) {
        const existing = await sql`
          SELECT 1 FROM public.activity_logs
          WHERE action_type = 'USER_REGISTER' AND target_id = ${session.user.id}
          LIMIT 1
        `;
        if (existing.length === 0) {
          await recordActivityLog({
            actionType: "USER_REGISTER",
            category: "user",
            actorId: session.user.id,
            actorName: session.user.name,
            actorEmail: session.user.email,
            actorRole: "user",
            targetId: session.user.id,
            targetType: "user",
            description: `New user joined via Google OAuth: ${session.user.name || "Student"} (${session.user.email})`,
            metadata: { provider: "google", email: session.user.email },
          });
        }
      }
    } catch {}
  }

  return response;
}
