"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull, notExists } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { sendAccessGrantedEmail, sendActivationEmail } from "@/lib/accounts";

const { enrollments, user, account } = schema;

export async function setAccess(userId: string, courseId: number, grant: boolean, notify: boolean) {
  const admin = await requireAdmin();
  if (grant) {
    await db
      .insert(enrollments)
      .values({ userId, courseId, source: "manual", grantedBy: admin.id })
      .onConflictDoUpdate({
        target: [enrollments.userId, enrollments.courseId],
        set: { revokedAt: null, grantedAt: new Date(), grantedBy: admin.id, source: "manual" },
      });
    if (notify) await sendAccessGrantedEmail(userId, courseId);
  } else {
    await db
      .update(enrollments)
      .set({ revokedAt: new Date() })
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
  }
  revalidatePath("/panel", "layout");
}

export async function resendActivation(userId: string) {
  await requireAdmin();
  const res = await sendActivationEmail(userId);
  revalidatePath(`/panel/alumnos/${userId}`);
  return res?.ok
    ? { ok: true as const, message: res.status === "skipped" ? "Email no enviado: falta configurar Brevo." : "Email enviado." }
    : { ok: false as const, message: "No se ha podido enviar el email. Revisa la configuración de Brevo." };
}

const newStudent = z.object({
  name: z.string().trim().min(1, "Escribe el nombre."),
  email: z.string().trim().toLowerCase().email("El email no es válido."),
  courses: z.array(z.coerce.number().int()).default([]),
  sendEmail: z.boolean(),
});

export type NewStudentState = { error?: string } | undefined;

export async function createStudent(_: NewStudentState, form: FormData): Promise<NewStudentState> {
  const admin = await requireAdmin();
  const parsed = newStudent.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    courses: form.getAll("courses"),
    sendEmail: form.get("sendEmail") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, email, courses, sendEmail } = parsed.data;

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return { error: "Ya hay un alumno con ese email. Búscalo en la lista y dale acceso desde su ficha." };

  const id = randomBytes(18).toString("base64url");
  await db.insert(user).values({ id, name, email, emailVerified: true, role: "student" });
  if (courses.length) {
    await db
      .insert(enrollments)
      .values(courses.map((courseId) => ({ userId: id, courseId, source: "manual" as const, grantedBy: admin.id })))
      .onConflictDoNothing();
  }
  if (sendEmail) await sendActivationEmail(id);
  revalidatePath("/panel");
  redirect(`/panel/alumnos/${id}?creado=1`);
}

/** Envía el email de activación a todos los alumnos con algún curso que
 * todavía no han creado contraseña. Se usa el día de la migración. */
export async function sendPendingActivations() {
  await requireAdmin();
  const pending = await db
    .selectDistinct({ id: user.id })
    .from(user)
    .innerJoin(enrollments, and(eq(enrollments.userId, user.id), isNull(enrollments.revokedAt)))
    .where(notExists(db.select().from(account).where(eq(account.userId, user.id))));
  let sent = 0;
  let failed = 0;
  for (const p of pending) {
    const r = await sendActivationEmail(p.id);
    if (r?.ok) sent++;
    else failed++;
  }
  revalidatePath("/panel");
  return { sent, failed };
}

export async function deleteStudent(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  await db.delete(user).where(and(eq(user.id, userId), inArray(user.role, ["student"])));
  revalidatePath("/panel");
  redirect("/panel");
}
