"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setDevRole(role: string) {
  const cookieStore = await cookies();
  if (!role || role === "guest") {
    cookieStore.delete("dev_role");
  } else {
    cookieStore.set("dev_role", role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  revalidatePath("/");
  revalidatePath("/dev");
}

export async function setDevRoleAction(formData: FormData) {
  const role = formData.get("role")?.toString() || "guest";
  await setDevRole(role);
}
