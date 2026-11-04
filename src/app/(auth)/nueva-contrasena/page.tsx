import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { AuthShell, Notice } from "@/components/ui";
import { NewPasswordForm } from "./form";

export const metadata: Metadata = { title: "Nueva contraseña" };
export const dynamic = "force-dynamic";

/** El enlace vale si su código existe (no se ha usado) y no ha caducado. */
async function tokenIsValid(token: string) {
  const rows = await db
    .select({ id: schema.verification.id })
    .from(schema.verification)
    .where(
      and(
        eq(schema.verification.identifier, `reset-password:${token}`),
        gt(schema.verification.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; modo?: string; error?: string }>;
}) {
  const { token, modo, error } = await searchParams;
  const activating = modo === "activar";

  if (!token || error || !(await tokenIsValid(token))) {
    return (
      <AuthShell title="Enlace no válido">
        <Notice tone="error">
          Este enlace ha caducado o ya se ha usado. Los enlaces para cambiar la contraseña duran 1 hora y los de
          activación 14 días, y cada uno sirve una sola vez.
        </Notice>
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
