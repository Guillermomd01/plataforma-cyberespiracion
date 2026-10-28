"use client";

import { useActionState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { createStudent, type NewStudentState } from "../../actions";

export function NewStudentForm({ courses }: { courses: { id: number; title: string }[] }) {
  const [state, action, pending] = useActionState<NewStudentState, FormData>(createStudent, undefined);
  return (
    <form action={action} className="rounded-lg border border-line bg-surface p-6">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field id="name" name="name" label="Nombre" autoComplete="off" required />
      <Field id="email" name="email" type="email" label="Email" autoComplete="off" required />
      <fieldset className="mb-6">
        <legend className="text-sm font-medium mb-2">Cursos a los que tiene acceso</legend>
        {courses.map((c) => (
          <label key={c.id} className="flex items-center gap-3 py-1.5">
            <input type="checkbox" name="courses" value={c.id} className="size-4 accent-[var(--accent)]" />
            {c.title}
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3 mb-6">
        <input type="checkbox" name="sendEmail" defaultChecked className="size-4 mt-1 accent-[var(--accent)]" />
        <span>
          Enviarle ahora el email para crear su contraseña
          <span className="block text-sm text-ink-soft">Si no, puedes enviarlo más tarde desde su ficha.</span>
        </span>
      </label>
      <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear alumno"}</Button>
    </form>
  );
}
