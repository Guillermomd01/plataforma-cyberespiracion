import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMyCourses } from "@/lib/queries";
import { ProgressBar } from "@/components/ui";

export const metadata: Metadata = { title: "Mis cursos" };

export default async function Page() {
  const user = await requireUser();
  const courses = await getMyCourses(user.id, user.role);
  const name = user.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <p className="text-ink-soft mb-2">Hola, {name}</p>
      <h1 className="text-4xl sm:text-5xl mb-10">Mis cursos</h1>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-6 max-w-xl">
          <p className="mb-2 font-medium">Todavía no tienes cursos activos.</p>
          <p className="text-ink-soft">
            Si has comprado uno y no aparece, escríbenos a{" "}
            <span className="select-all">hola@cyberespiracion.com</span> y lo revisamos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const started = c.done > 0;
            const finished = c.total > 0 && c.done === c.total;
            return (
              <li key={c.id} className="rounded-lg border border-line bg-surface p-6 flex flex-col">
                <h2 className="text-2xl mb-6">
                  <Link href={`/cursos/${c.slug}`} className="hover:text-accent">{c.title}</Link>
                </h2>
                <div className="mt-auto">
                  <ProgressBar done={c.done} total={c.total} label={`Progreso en ${c.title}`} />
                  {c.nextLesson && (
                    <Link
                      href={`/cursos/${c.slug}/${c.nextLesson.slug}`}
                      className="mt-5 inline-flex rounded-md bg-accent text-accent-ink px-4 py-2.5 text-[15px] font-medium hover:opacity-90"
                    >
                      {finished ? "Repasar" : started ? "Continuar" : "Empezar"}
                    </Link>
                  )}
                  {c.nextLesson && !finished && (
                    <p className="text-sm text-ink-soft mt-3">Siguiente: {c.nextLesson.title}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
