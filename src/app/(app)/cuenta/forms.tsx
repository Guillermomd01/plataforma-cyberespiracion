"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Notice } from "@/components/ui";

type Msg = { tone: "error" | "success"; text: string } | null;

export function AccountForms({ name }: { name: string }) {
  const router = useRouter();
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [passMsg, setPassMsg] = useState<Msg>(null);
  const [pending, setPending] = useState<"name" | "pass" | "out" | null>(null);

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("name")).trim();
    if (!value) return setNameMsg({ tone: "error", text: "Escribe tu nombre." });
    setPending("name");
    const { error } = await authClient.updateUser({ name: value });
    setPending(null);
    setNameMsg(error ? { tone: "error", text: "No se ha podido guardar. Inténtalo de nuevo." } : { tone: "success", text: "Nombre guardado." });
    router.refresh();
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current"));
    const next = String(data.get("next"));
    if (next.length < 8) return setPassMsg({ tone: "error", text: "La nueva contraseña necesita al menos 8 caracteres." });
    setPending("pass");
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setPending(null);
    if (error) return setPassMsg({ tone: "error", text: "La contraseña actual no es correcta." });
    form.reset();
    setPassMsg({ tone: "success", text: "Contraseña cambiada. Hemos cerrado la sesión en tus otros dispositivos." });
  }

  async function signOut() {
    setPending("out");
    await authClient.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <div className="space-y-12">
      <form onSubmit={saveName} className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-2xl mb-5">Nombre</h2>
        {nameMsg && <Notice tone={nameMsg.tone}>{nameMsg.text}</Notice>}
        <Field id="name" name="name" label="Cómo quieres que te llamemos" defaultValue={name} autoComplete="name" />
        <Button type="submit" variant="quiet" disabled={pending === "name"}>Guardar nombre</Button>
      </form>

      <form onSubmit={savePassword} className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-2xl mb-5">Contraseña</h2>
        {passMsg && <Notice tone={passMsg.tone}>{passMsg.text}</Notice>}
        <Field id="current" name="current" type="password" label="Contraseña actual" autoComplete="current-password" />
        <Field id="next" name="next" type="password" label="Nueva contraseña" hint="Mínimo 8 caracteres." autoComplete="new-password" />
        <Button type="submit" variant="quiet" disabled={pending === "pass"}>Cambiar contraseña</Button>
      </form>

      <div>
        <Button variant="quiet" onClick={signOut} disabled={pending === "out"}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
