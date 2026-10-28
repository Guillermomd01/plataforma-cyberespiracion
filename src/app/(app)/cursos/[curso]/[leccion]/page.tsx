import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getLessonDetail, getOutline, hasAccess, touchActivity } from "@/lib/queries";
import { signedFileUrl, youtubeId } from "@/lib/files";
import { CourseOutline } from "@/components/course-outline";
import { CompleteButton } from "./complete-button";

type Params = { curso: string; leccion: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { curso, leccion } = await params;
  const [row] = await db
    .select({ title: schema.lessons.title })
    .from(schema.lessons)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.lessons.courseId))
    .where(and(eq(schema.courses.slug, curso), eq(schema.lessons.slug, leccion)));
  return { title: row?.title ?? "Lección" };
}

function YouTube({ id, title }: { id: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
        className="size-full"
      />
    </div>
  );
}

/** Convierte los marcadores de vídeo adicionales del cuerpo en reproductores. */
function renderBody(html: string) {
  return html.replace(/<div data-youtube="([^"]+)"><\/div>/g, (_, url) => {
    const id = youtubeId(url.replace(/&amp;/g, "&"));
    return id
      ? `<div class="aspect-video w-full overflow-hidden rounded-lg bg-black my-6"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="Vídeo" allowfullscreen loading="lazy" class="size-full"></iframe></div>`
      : "";
  });
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_000_000 ? `${Math.round(bytes / 1_000_000)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { curso, leccion } = await params;
  const user = await requireUser();
  const outline = await getOutline(curso, user.id);
  if (!outline) notFound();
  if (!(await hasAccess(user.id, outline.course.id, user.role))) redirect("/cursos");

  const detail = await getLessonDetail(outline.course.id, leccion);
  if (!detail) notFound();
  const { lesson, files } = detail;
  await touchActivity(user.id, outline.course.id, lesson.id);

  const idx = outline.flat.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? outline.flat[idx - 1] : null;
  const next = idx >= 0 && idx < outline.flat.length - 1 ? outline.flat[idx + 1] : null;
  const done = outline.flat[idx]?.done ?? false;
  const moduleTitle = outline.modules.find((m) => m.id === lesson.moduleId)?.title;
  const video = youtubeId(lesson.videoUrl);
  const audios = files.filter((f) => f.kind === "audio");
  const docs = files.filter((f) => f.kind === "pdf");
  const base = `/cursos/${outline.course.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 lg:py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <main className="min-w-0">
        <nav className="text-sm text-ink-soft mb-4" aria-label="Ruta">
          <Link href={base} className="hover:text-accent">{outline.course.title}</Link>
          {moduleTitle && outline.modules.length > 1 && <span> · {moduleTitle}</span>}
        </nav>
        <h1 className="text-3xl sm:text-4xl mb-8">{lesson.title}</h1>

        {video && <YouTube id={video} title={lesson.title} />}

        {lesson.bodyHtml && (
          <div className="prose-lesson mt-8" dangerouslySetInnerHTML={{ __html: renderBody(lesson.bodyHtml) }} />
        )}

        {audios.length > 0 && (
          <section className="mt-10" aria-labelledby="audios">
            <h2 id="audios" className="text-2xl mb-4">{audios.length > 1 ? "Audios" : "Audio de la práctica"}</h2>
            <ul className="space-y-4">
              {audios.map((a) => {
                const src = signedFileUrl(a.storagePath);
                return (
                  <li key={a.id} className="rounded-lg border border-line bg-surface p-4">
                    <p className="text-[15px] font-medium mb-3">{a.title}</p>
                    {src ? (
                      <audio controls preload="none" src={src} className="w-full">
                        Tu navegador no puede reproducir este audio.
                      </audio>
                    ) : (
                      <p className="text-sm text-ink-soft">El audio estará disponible en breve.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {docs.length > 0 && (
          <section className="mt-10" aria-labelledby="materiales">
            <h2 id="materiales" className="text-2xl mb-4">Material</h2>
            <ul className="space-y-2">
              {docs.map((d) => {
                const href = signedFileUrl(d.storagePath);
                const name = d.title.replace(/\.pdf$/i, "").trim();
                return (
                  <li key={d.id}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener" className="inline-flex items-baseline gap-2 text-accent underline underline-offset-4">
                        {name}
                        <span className="text-sm text-ink-soft no-underline">PDF · {formatSize(d.sizeBytes)}</span>
                      </a>
                    ) : (
                      <span className="text-ink-soft">{name} (disponible en breve)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-12 pt-8 border-t border-line">
          <CompleteButton lessonId={lesson.id} done={done} nextHref={next ? `${base}/${next.slug}` : null} />
          <div className="mt-8 flex justify-between gap-4 text-[15px]">
            {prev ? (
              <Link href={`${base}/${prev.slug}`} className="text-ink-soft hover:text-accent min-w-0">
                ← <span className="truncate">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`${base}/${next.slug}`} className="text-ink-soft hover:text-accent text-right min-w-0">
                <span className="truncate">{next.title}</span> →
              </Link>
            )}
          </div>
        </div>
      </main>

      <aside className="mt-14 lg:mt-0">
        <details className="lg:hidden rounded-lg border border-line bg-surface p-4" >
          <summary className="cursor-pointer font-medium">Contenido del curso</summary>
          <div className="mt-4"><CourseOutline outline={outline} currentLessonId={lesson.id} compact /></div>
        </details>
        <div className="hidden lg:block sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">
          <p className="font-display text-xl mb-5">{outline.course.title}</p>
          <CourseOutline outline={outline} currentLessonId={lesson.id} compact />
        </div>
      </aside>
    </div>
  );
}
