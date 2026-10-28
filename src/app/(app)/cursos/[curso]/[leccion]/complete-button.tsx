"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setLessonDone } from "../actions";

export function CompleteButton({
  lessonId,
  done,
  nextHref,
}: {
  lessonId: number;
  done: boolean;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(done);

  function toggle(goNext: boolean) {
    start(async () => {
      setOptimistic(!optimistic);
      await setLessonDone(lessonId, !optimistic);
      if (goNext && nextHref) router.push(nextHref);
    });
  }

  if (optimistic) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-done font-medium">
          <svg viewBox="0 0 12 12" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2.5 6.5l2.2 2L9.5 3.5" />
          </svg>
          Lección completada
        </span>
        <button onClick={() => toggle(false)} disabled={pending} className="text-sm text-ink-soft underline underline-offset-4">
          Marcar como no completada
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => toggle(true)}
      disabled={pending}
      className="inline-flex items-center rounded-md bg-accent text-accent-ink px-4 py-2.5 text-[15px] font-medium hover:opacity-90 disabled:opacity-60"
    >
      {nextHref ? "Completar y seguir" : "Marcar como completada"}
    </button>
  );
}
