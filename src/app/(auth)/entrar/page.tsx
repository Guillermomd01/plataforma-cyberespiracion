import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ listo?: string }> }) {
  if (await getSession()) redirect("/cursos");
  const { listo } = await searchParams;
  return (
    <AuthShell title="Entrar" intro="Accede a tus cursos con tu email y tu contraseña.">
      <LoginForm passwordJustSet={listo === "1"} />
    </AuthShell>
  );
}
