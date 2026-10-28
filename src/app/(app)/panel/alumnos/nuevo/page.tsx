import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { NewStudentForm } from "./form";

export const metadata: Metadata = { title: "Nuevo alumno" };

export default async function Page() {
  await requireAdmin();
  const courses = await db
    .select({ id: schema.courses.id, title: schema.courses.title })
    .from(schema.courses)
    .orderBy(asc(schema.courses.position));
  return (
    <main className="mx-auto max-w-xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/panel" className="text-sm text-ink-soft hover:text-accent">← Alumnos</Link>
      <h1 className="text-4xl mt-4 mb-8">Nuevo alumno</h1>
      <NewStudentForm courses={courses} />
    </main>
  );
}
