"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import { sendPendingActivations } from "./actions";

export function BulkActivation({ pending }: { pending: number }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (result) return <Notice tone="success">{result}</Notice>;

  return (
    <div className="rounded-lg border border-line bg-surface p-5 mb-8 flex flex-wrap items-center gap-4 justify-between">
      <p className="max-w-xl">
        <strong className="font-semibold">{pending} alumnos con curso</strong> todavía no han creado su contraseña en la plataforma nueva.
      </p>
      {confirming ? (
        <div className="flex gap-3">
          <Button
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await sendPendingActivations();
                setResult(
                  r.failed
                    ? `Enviados ${r.sent}. Fallaron ${r.failed}: revisa la configuración de Brevo.`
                    : `Enviados ${r.sent} emails de activación.`,
                );
              })
            }
          >
            {busy ? "Enviando…" : `Sí, enviar ${pending} emails`}
          </Button>
          <Button variant="quiet" onClick={() => setConfirming(false)} disabled={busy}>Cancelar</Button>
        </div>
      ) : (
        <Button variant="quiet" onClick={() => setConfirming(true)}>Enviar email de activación</Button>
      )}
    </div>
  );
}
