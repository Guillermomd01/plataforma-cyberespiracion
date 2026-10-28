"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/session";
import { hasAccess } from "@/lib/queries";

export async function setLessonDone(lessonId: number, done: boolean) {
  const user = await requireUser();
  const [lesson] = await db
    .select({ id: schema.lessons.id, courseId: schema.lessons.courseId })
    .from(schema.lessons)
    .where(eq(schema.lessons.id, lessonId));
  if (!lesson || !(await hasAccess(user.id, lesson.courseId, user.role))) {
    return { ok: false as const };
  }
  if (done) {
    await db.insert(schema.lessonProgress).values({ userId: user.id, lessonId }).onConflictDoNothing();
  } else {
    await db
      .delete(schema.lessonProgress)
      .where(and(eq(schema.lessonProgress.userId, user.id), eq(schema.lessonProgress.lessonId, lessonId)));
  }
  revalidatePath("/cursos", "layout");
  return { ok: true as const };
}
