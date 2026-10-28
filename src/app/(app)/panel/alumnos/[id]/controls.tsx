"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { resendActivation, setAccess } from "../../actions";

export function AccessToggle({ userId, courseId, active }: { userId: string; courseId: number; active: boolean }) {
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState<"grant" | "revoke" | null>(null);

  if (confirm === "grant") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => start(async () => { await setAccess(userId, courseId, true, true); setConfirm(null); })}>
          Dar acceso y avisar por email
        </Button>
        <Button variant="quiet" disabled={busy} onClick={() => start(async () => { await setAccess(userId, courseId, true, false); setConfirm(null); })}>
          Dar acceso sin email
        </Button>
        <Button variant="quiet" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</Button>
      </div>
    );
  }
  if (confirm === "revoke") {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm">¿Quitar el acceso? Su progreso se conserva.</span>
        <Button variant="danger" disabled={busy} onClick={() => start(async () => { await setAccess(userId, courseId, false, false); setConfirm(null); })}>
          Quitar acceso
        </Button>
        <Button variant="quiet" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</Button>
      </div>
    );
  }
  return active ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-done">Con acceso</span>
      <Button variant="quiet" onClick={() => setConfirm("revoke")}>Quitar</Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-soft">Sin acceso</span>
      <Button variant="quiet" onClick={() => setConfirm("grant")}>Dar acceso</Button>
    </div>
  );
}

export function ActivationButton({ userId, activated }: { userId: string; activated: boolean }) {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="quiet"
        disabled={busy}
        onClick={() => start(async () => setMsg((await resendActivation(userId)).message))}
      >
        {busy ? "Enviando…" : activated ? "Enviar enlace para cambiar contraseña" : "Enviar email de activación"}
      </Button>
      {msg && <span role="status" className="text-sm text-ink-soft">{msg}</span>}
    </div>
  );
}
