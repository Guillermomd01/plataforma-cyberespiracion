import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { hasPassword } from "@/lib/accounts";
import { Notice, ProgressBar } from "@/components/ui";
import { AccessToggle, ActivationButton } from "./controls";

const { user, courses, enrollments, lessons, lessonProgress, emailLog } = schema;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { creado } = await searchParams;
  const [student] = await db.select().from(user).where(eq(user.id, id));
  if (!student) notFound();

  const allCourses = await db.select().from(courses).orderBy(asc(courses.position));
  const enr = await db.select().from(enrollments).where(eq(enrollments.userId, id));
  const progress = await db
    .select({ courseId: lessons.courseId, done: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.userId, id))
    .groupBy(lessons.courseId);
  const totals = await db
    .select({ courseId: lessons.courseId, total: sql<number>`count(*)::int` })
    .from(lessons)
    .where(eq(lessons.status, "published"))
    .groupBy(lessons.courseId);
  const emails = await db
    .select()
    .from(emailLog)
    .where(and(eq(emailLog.userId, id)))
    .orderBy(sql`${emailLog.createdAt} DESC`)
    .limit(8);
  const activated = await hasPassword(id);
  const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });
  const templateNames: Record<string, string> = {
    activate: "Activa tu cuenta",
    "reset-password": "Restablecer contraseña",
    "password-changed": "Contraseña cambiada",
    "access-granted": "Acceso a un curso",
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/panel" className="text-sm text-ink-soft hover:text-accent">← Alumnos</Link>
      <h1 className="text-4xl mt-4 mb-1">{student.name}</h1>
      <p className="text-ink-soft mb-8">{student.email}</p>

      {creado && <Notice tone="success">Alumno creado.</Notice>}

      <section className="rounded-lg border border-line bg-surface p-6 mb-8">
        <h2 className="text-2xl mb-3">Cuenta</h2>
        <p className="mb-4">
          {activated
            ? "Ha creado su contraseña y puede entrar."
            : "Todavía no ha creado su contraseña. Envíale el enlace para hacerlo."}
        </p>
        <ActivationButton userId={id} activated={activated} />
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 mb-8">
        <h2 className="text-2xl mb-5">Cursos</h2>
        <ul className="divide-y divide-line">
          {allCourses.map((c) => {
            const e = enr.find((x) => x.courseId === c.id);
            const active = !!e && !e.revokedAt;
            const done = progress.find((p) => p.courseId === c.id)?.done ?? 0;
            const total = totals.find((t) => t.courseId === c.id)?.total ?? 0;
            return (
              <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="font-medium">{c.title}</span>
                  <AccessToggle userId={id} courseId={c.id} active={active} />
                </div>
                {active && <ProgressBar done={done} total={total} label={`Progreso en ${c.title}`} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-2xl mb-4">Últimos emails</h2>
        {emails.length === 0 ? (
          <p className="text-ink-soft">Ninguno todavía.</p>
        ) : (
          <ul className="text-[15px] space-y-2">
            {emails.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2">
                <span>{templateNames[m.template] ?? m.template}</span>
                <span className="text-ink-soft tabular-nums">
                  {m.status === "sent" ? "Enviado" : m.status === "skipped" ? "No enviado (Brevo sin configurar)" : "Error"} · {fmt.format(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
