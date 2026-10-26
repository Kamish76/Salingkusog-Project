import { redirect } from "next/navigation";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

export const instant = false;

export default async function DevToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!isSuperAdmin(user)) {
    redirect("/dev?error=unauthorized");
  }

  return children;
}
