import Link from "next/link";
import type { Outline } from "@/lib/queries";

export function CourseOutline({
  outline,
  currentLessonId,
  compact = false,
}: {
  outline: NonNullable<Outline>;
  currentLessonId?: number;
  compact?: boolean;
}) {
  const { course, modules } = outline;
  return (
    <nav aria-label={`Contenido de ${course.title}`}>
      <ol className="space-y-7">
        {modules.map((m) => (
          <li key={m.id}>
            {(modules.length > 1 || !compact) && (
              <h3 className={`font-sans font-semibold tracking-wide uppercase text-ink-soft mb-2 ${compact ? "text-xs" : "text-[13px]"}`}>
                {m.title}
              </h3>
            )}
            <ol>
              {m.lessons.map((l) => {
                const current = l.id === currentLessonId;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/cursos/${course.slug}/${l.slug}`}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-start gap-3 rounded-md px-2 py-2 -mx-2 ${compact ? "text-sm" : "text-[15px]"} ${
                        current ? "bg-accent-soft font-medium" : "hover:bg-accent-soft/60"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-[3px] grid place-items-center size-[18px] shrink-0 rounded-full border ${
                          l.done ? "bg-done border-done text-surface" : "border-line"
                        }`}
                      >
                        {l.done && (
                          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5l2.2 2L9.5 3.5" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0">
                        {l.title}
                        <span className="sr-only">{l.done ? " (completada)" : ""}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
