"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Notice } from "@/components/ui";

export function LoginForm({ passwordJustSet }: { passwordJustSet: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera un minuto y vuelve a probar."
          : "El email o la contraseña no son correctos. Si vienes de la plataforma anterior, crea tu contraseña con «¿Olvidaste tu contraseña?».",
      );
      return;
    }
    router.replace("/cursos");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {passwordJustSet && <Notice tone="success">Contraseña guardada. Ya puedes entrar.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <Field id="password" name="password" type="password" label="Contraseña" autoComplete="current-password" required />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="mt-6 text-sm">
        <Link href="/recuperar" className="text-accent underline underline-offset-4">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
