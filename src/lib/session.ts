import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  return session.user as typeof session.user & { role: string };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/cursos");
  return user;
}
