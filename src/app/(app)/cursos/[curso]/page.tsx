import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOutline, hasAccess } from "@/lib/queries";
import { CourseOutline } from "@/components/course-outline";
import { ProgressBar } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ curso: string }> }) {
  const [c] = await db
    .select({ title: schema.courses.title })
    .from(schema.courses)
    .where(eq(schema.courses.slug, (await params).curso));
  return { title: c?.title ?? "Curso" };
}

export default async function Page({ params }: { params: Promise<{ curso: string }> }) {
  const { curso } = await params;
  const user = await requireUser();
  const outline = await getOutline(curso, user.id);
  if (!outline) notFound();
  if (!(await hasAccess(user.id, outline.course.id, user.role))) redirect("/cursos");

  const next = outline.flat.find((l) => !l.done) ?? outline.flat[0];

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/cursos" className="text-sm text-ink-soft hover:text-accent">← Mis cursos</Link>
      <h1 className="text-4xl sm:text-5xl mt-4 mb-8">{outline.course.title}</h1>
      <div className="mb-8 max-w-md">
        <ProgressBar done={outline.doneCount} total={outline.flat.length} />
      </div>
      {next && (
        <Link
          href={`/cursos/${outline.course.slug}/${next.slug}`}
          className="inline-flex rounded-md bg-accent text-accent-ink px-4 py-2.5 text-[15px] font-medium hover:opacity-90 mb-12"
        >
          {outline.doneCount === 0 ? "Empezar el curso" : `Continuar: ${next.title}`}
        </Link>
      )}
      {outline.course.descriptionHtml && (
        <div className="prose-lesson mb-12" dangerouslySetInnerHTML={{ __html: outline.course.descriptionHtml }} />
      )}
      <CourseOutline outline={outline} />
    </main>
  );
}
