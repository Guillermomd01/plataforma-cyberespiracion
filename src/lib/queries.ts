import "server-only";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { courses, modules, lessons, enrollments, lessonProgress, courseActivity, assets, lessonAssets } = schema;

/** Condición de acceso vigente. */
const activeEnrollment = and(
  isNull(enrollments.revokedAt),
  or(isNull(enrollments.expiresAt), gt(enrollments.expiresAt, sql`now()`)),
);

export async function hasAccess(userId: string, courseId: number, role: string) {
  if (role === "admin") return true;
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), activeEnrollment));
  return rows.length > 0;
}

export type CourseCard = {
  id: number;
  slug: string;
  title: string;
  total: number;
  done: number;
  nextLesson: { slug: string; title: string } | null;
};

export async function getMyCourses(userId: string, role: string): Promise<CourseCard[]> {
  const base = db
    .select({ id: courses.id, slug: courses.slug, title: courses.title, position: courses.position })
    .from(courses);
  const list =
    role === "admin"
      ? await base.orderBy(asc(courses.position))
      : await base
          .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
          .where(and(eq(enrollments.userId, userId), activeEnrollment, eq(courses.status, "published")))
          .orderBy(asc(courses.position));
  if (!list.length) return [];

  const ids = list.map((c) => c.id);
  const all = await db
    .select({
      id: lessons.id,
      courseId: lessons.courseId,
      slug: lessons.slug,
      title: lessons.title,
      mpos: modules.position,
      pos: lessons.position,
    })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(and(inArray(lessons.courseId, ids), eq(lessons.status, "published")))
    .orderBy(asc(modules.position), asc(lessons.position));
  const done = new Set(
    (
      await db
        .select({ id: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
    ).map((r) => r.id),
  );
  const activity = await db
    .select()
    .from(courseActivity)
    .where(and(eq(courseActivity.userId, userId), inArray(courseActivity.courseId, ids)));

  return list.map((c) => {
    const ls = all.filter((l) => l.courseId === c.id);
    const last = activity.find((a) => a.courseId === c.id)?.lastLessonId;
    // Siguiente: la primera sin completar; si todo está hecho, la última abierta.
    const next = ls.find((l) => !done.has(l.id)) ?? ls.find((l) => l.id === last) ?? ls[0] ?? null;
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      total: ls.length,
      done: ls.filter((l) => done.has(l.id)).length,
      nextLesson: next ? { slug: next.slug, title: next.title } : null,
    };
  });
}

export type Outline = Awaited<ReturnType<typeof getOutline>>;

export async function getOutline(courseSlug: string, userId: string) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, courseSlug));
  if (!course) return null;
  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id))
    .orderBy(asc(modules.position));
  const ls = await db
    .select({
      id: lessons.id,
      moduleId: lessons.moduleId,
      slug: lessons.slug,
      title: lessons.title,
      hasVideo: sql<boolean>`${lessons.videoUrl} IS NOT NULL`,
    })
    .from(lessons)
    .where(and(eq(lessons.courseId, course.id), eq(lessons.status, "published")))
    .orderBy(asc(lessons.position));
  const done = new Set(
    (
      await db
        .select({ id: lessonProgress.lessonId })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(and(eq(lessonProgress.userId, userId), eq(lessons.courseId, course.id)))
    ).map((r) => r.id),
  );
  const modulesWithLessons = mods
    .map((m) => ({ ...m, lessons: ls.filter((l) => l.moduleId === m.id).map((l) => ({ ...l, done: done.has(l.id) })) }))
    .filter((m) => m.lessons.length > 0);
  const flat = modulesWithLessons.flatMap((m) => m.lessons);
  return { course, modules: modulesWithLessons, flat, doneCount: flat.filter((l) => l.done).length };
}

export async function getLessonDetail(courseId: number, lessonSlug: string) {
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.courseId, courseId), eq(lessons.slug, lessonSlug)));
  if (!lesson) return null;
  const files = await db
    .select({
      id: assets.id,
      kind: assets.kind,
      title: assets.title,
      storagePath: assets.storagePath,
      sizeBytes: assets.sizeBytes,
    })
    .from(lessonAssets)
    .innerJoin(assets, eq(assets.id, lessonAssets.assetId))
    .where(eq(lessonAssets.lessonId, lesson.id))
    .orderBy(asc(lessonAssets.position));
  return { lesson, files };
}

export async function touchActivity(userId: string, courseId: number, lessonId: number) {
  await db
    .insert(courseActivity)
    .values({ userId, courseId, lastLessonId: lessonId })
    .onConflictDoUpdate({
      target: [courseActivity.userId, courseActivity.courseId],
      set: { lastLessonId: lessonId, updatedAt: new Date() },
    });
}
