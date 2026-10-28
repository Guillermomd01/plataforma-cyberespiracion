import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  serial,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Cuentas (tablas que usa Better Auth)                                */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // "student" | "admin"
  role: text("role").notNull().default("student"),
  // Id del usuario en WordPress, para trazar la migración
  wpId: integer("wp_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Contenido                                                           */
/* ------------------------------------------------------------------ */

export const contentStatus = pgEnum("content_status", ["draft", "published"]);

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  descriptionHtml: text("description_html"),
  coverUrl: text("cover_url"),
  status: contentStatus("status").notNull().default("draft"),
  position: integer("position").notNull().default(0),
  wpId: integer("wp_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Bloque de un curso (en LearnDash era la "lección").
export const modules = pgTable(
  "modules",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    wpId: integer("wp_id").unique(),
  },
  (t) => [index("modules_course_idx").on(t.courseId)],
);

// Unidad que ve el alumno (en LearnDash era el "tema").
export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bodyHtml: text("body_html"),
    // URL de YouTube (se muestra con youtube-nocookie.com)
    videoUrl: text("video_url"),
    status: contentStatus("status").notNull().default("published"),
    position: integer("position").notNull().default(0),
    wpId: integer("wp_id").unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lessons_module_idx").on(t.moduleId),
    uniqueIndex("lessons_course_slug_idx").on(t.courseId, t.slug),
  ],
);

export const assetKind = pgEnum("asset_kind", ["audio", "pdf", "image", "other"]);

// Archivo guardado en Bunny Storage.
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  kind: assetKind("kind").notNull(),
  // Ruta dentro de la Storage Zone, p. ej. "wp/162-Atributo-2-y-3-audio.mp3"
  storagePath: text("storage_path").notNull().unique(),
  title: text("title").notNull(),
  mime: text("mime"),
  sizeBytes: integer("size_bytes"),
  wpId: integer("wp_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonAssets = pgTable(
  "lesson_assets",
  {
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.assetId] })],
);

/* ------------------------------------------------------------------ */
/* Accesos, progreso y ventas                                          */
/* ------------------------------------------------------------------ */

export const enrollmentSource = pgEnum("enrollment_source", [
  "migration",
  "manual",
  "stripe",
  "free",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    source: enrollmentSource("source").notNull(),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    // null = para siempre
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("enrollments_user_course_idx").on(t.userId, t.courseId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

// Última lección abierta por curso, para el botón "Continuar".
export const courseActivity = pgTable(
  "course_activity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lastLessonId: integer("last_lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

// Lo que se vende. Un producto abre uno o varios cursos (packs).
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("eur"),
  // 1 = pago único; 2 o 3 = pago fraccionado en meses
  installments: integer("installments").notNull().default(1),
  stripePriceId: text("stripe_price_id"),
  active: boolean("active").notNull().default(true),
  wpId: integer("wp_id").unique(),
});

export const productCourses = pgTable(
  "product_courses",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.courseId] })],
);

export const paymentMethod = pgEnum("payment_method", [
  "stripe",
  "bizum",
  "transfer",
  "cash",
  "other",
]);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    method: paymentMethod("method").notNull(),
    stripeSessionId: text("stripe_session_id").unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("payments_user_idx").on(t.userId)],
);

// Registro de emails enviados, para poder comprobar qué recibió cada alumno.
export const emailLog = pgTable(
  "email_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    template: text("template").notNull(),
    toEmail: text("to_email").notNull(),
    status: text("status").notNull(),
    providerId: text("provider_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_log_user_idx").on(t.userId)],
);
