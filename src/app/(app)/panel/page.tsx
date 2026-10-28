import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { BulkActivation } from "./bulk-activation";

export const metadata: Metadata = { title: "Panel" };

const { user, enrollments, courses, account, lessonProgress } = schema;

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const term = q.trim();

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      activated: sql<boolean>`EXISTS (SELECT 1 FROM ${account} WHERE ${account.userId} = ${user.id})`,
      courses: sql<string[]>`COALESCE(ARRAY(SELECT ${courses.title} FROM ${enrollments} JOIN ${courses} ON ${courses.id} = ${enrollments.courseId} WHERE ${enrollments.userId} = ${user.id} AND ${enrollments.revokedAt} IS NULL ORDER BY ${courses.position}), '{}')`,
      lastDone: sql<string | null>`(SELECT MAX(${lessonProgress.completedAt}) FROM ${lessonProgress} WHERE ${lessonProgress.userId} = ${user.id})`,
    })
    .from(user)
    .where(term ? or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`)) : undefined)
    .orderBy(desc(sql`${user.role} = 'admin'`), asc(user.name));

  const pending = rows.filter((r) => !r.activated && r.courses.length > 0).length;
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl mb-1">Alumnos</h1>
          <p className="text-ink-soft tabular-nums">
            {rows.length} {term ? "resultados" : "en total"} · {pending} sin activar su cuenta
          </p>
        </div>
        <Link href="/panel/alumnos/nuevo" className="inline-flex rounded-md bg-accent text-accent-ink px-4 py-2.5 text-[15px] font-medium hover:opacity-90">
          Nuevo alumno
        </Link>
      </div>

      {pending > 0 && !term && <BulkActivation pending={pending} />}

      <form className="mb-6 max-w-md" role="search">
        <label htmlFor="q" className="sr-only">Buscar alumno</label>
        <input
          id="q"
          name="q"
          defaultValue={term}
          placeholder="Buscar por nombre o email"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 focus:border-accent focus:outline-none"
        />
      </form>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-[15px]">
          <thead className="text-left text-sm text-ink-soft border-b border-line">
            <tr>
              <th className="font-medium px-4 py-3">Alumno</th>
              <th className="font-medium px-4 py-3">Cursos</th>
              <th className="font-medium px-4 py-3">Cuenta</th>
              <th className="font-medium px-4 py-3 whitespace-nowrap">Última lección</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-accent-soft/40">
                <td className="px-4 py-3">
                  <Link href={`/panel/alumnos/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>
                  {r.role === "admin" && <span className="ml-2 text-xs rounded bg-accent-soft px-1.5 py-0.5">admin</span>}
                  <div className="text-sm text-ink-soft">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-sm">{r.courses.length ? r.courses.join(", ") : <span className="text-ink-soft">Ninguno</span>}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {r.activated ? (
                    <span className="text-done">Activada</span>
                  ) : (
                    <span className="text-ink-soft">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap tabular-nums">
                  {r.lastDone ? fmt.format(new Date(r.lastDone)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
