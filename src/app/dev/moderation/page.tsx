import { connection } from "next/server";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getModerationPostsAction } from "@/app/actions/moderation";
import { ModerationClient } from "./moderation-client";

export const instant = false;

export default async function DevModerationPage() {
  await connection();

  const user = await getCurrentUser();
  if (!isModerator(user)) {
    redirect("/?auth=required");
  }

  const initialPosts = await getModerationPostsAction({ status: "all", limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🛡️</span>
            <span>Campus Photo Moderation & Safety Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Review student challenge uploads, manage AI-flagged content, and protect campus community standards.
          </p>
        </div>
      </div>

      <ModerationClient initialPosts={initialPosts} />
    </div>
  );
}
