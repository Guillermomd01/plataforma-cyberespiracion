"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Notice } from "@/components/ui";

export function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const repeat = String(form.get("repeat"));
    if (password.length < 8) return setError("La contraseña necesita al menos 8 caracteres.");
    if (password !== repeat) return setError("Las dos contraseñas no coinciden.");
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setError(
        <>
          El enlace ha caducado o ya se ha usado.{" "}
          <Link href="/recuperar" className="underline">Pide uno nuevo</Link>.
        </>,
      );
      return;
    }
    router.replace("/entrar?listo=1");
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <Field id="password" name="password" type="password" label="Contraseña" hint="Mínimo 8 caracteres." autoComplete="new-password" required minLength={8} />
      <Field id="repeat" name="repeat" type="password" label="Repite la contraseña" autoComplete="new-password" required />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
