import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, Notice } from "@/components/ui";
import { NewPasswordForm } from "./form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; modo?: string; error?: string }>;
}) {
  const { token, modo, error } = await searchParams;
  const activating = modo === "activar";

  if (!token || error) {
    return (
      <AuthShell title="Enlace no válido">
        <Notice tone="error">Este enlace ha caducado o ya se ha usado.</Notice>
        <Link href="/recuperar" className="text-accent underline underline-offset-4">Pedir un enlace nuevo</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={activating ? "Crea tu contraseña" : "Elige una contraseña nueva"}
      intro={
        activating
          ? "Te damos la bienvenida a la nueva plataforma. Tus cursos y tu progreso ya están aquí; solo falta tu contraseña."
          : "Escribe tu nueva contraseña. Cerraremos las sesiones abiertas en otros dispositivos."
      }
    >
      <NewPasswordForm token={token} />
    </AuthShell>
  );
}
