"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthShell, Button, Field, Notice } from "@/components/ui";

export default function Page() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/nueva-contrasena" });
    setPending(false);
    if (error && error.status === 429) {
      setError("Demasiados intentos. Espera un minuto y vuelve a probar.");
      return;
    }
    // Por seguridad, la respuesta es la misma exista o no la cuenta.
    setSent(true);
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      intro="Te enviamos un enlace para elegir una contraseña nueva. Sirve también si vienes de la plataforma anterior."
    >
      {sent ? (
        <>
          <Notice tone="success">
            Si hay una cuenta con ese email, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.
          </Notice>
          <Link href="/entrar" className="text-sm text-accent underline underline-offset-4">Volver a entrar</Link>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          {error && <Notice tone="error">{error}</Notice>}
          <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
          <p className="mt-6 text-sm">
            <Link href="/entrar" className="text-accent underline underline-offset-4">Volver a entrar</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
