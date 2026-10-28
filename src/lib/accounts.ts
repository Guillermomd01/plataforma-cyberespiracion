import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { passwordUrl, siteUrl } from "@/lib/auth";
import { sendTemplate } from "@/lib/email";

const ACTIVATION_DAYS = 14;

/** Crea un enlace para que el alumno elija su contraseña. Usa el mismo
 * mecanismo que «restablecer contraseña» de Better Auth, con caducidad larga. */
export async function createActivationUrl(userId: string) {
  const token = randomBytes(24).toString("base64url");
  await db.insert(schema.verification).values({
    id: randomUUID(),
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + ACTIVATION_DAYS * 86400_000),
  });
  return passwordUrl(token, "activate");
}

export async function sendActivationEmail(userId: string) {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
  if (!u) throw new Error("Alumno no encontrado");
  const url = await createActivationUrl(u.id);
  return sendTemplate("activate", {
    to: { email: u.email, name: u.name },
    userId: u.id,
    params: { name: u.name, url },
  });
}

export async function sendAccessGrantedEmail(userId: string, courseId: number) {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
  const [c] = await db.select().from(schema.courses).where(eq(schema.courses.id, courseId));
  if (!u || !c) return;
  return sendTemplate("access-granted", {
    to: { email: u.email, name: u.name },
    userId: u.id,
    params: { name: u.name, course: c.title, url: `${siteUrl()}/cursos/${c.slug}` },
  });
}

/** ¿Ha creado ya contraseña? */
export async function hasPassword(userId: string) {
  const rows = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(eq(schema.account.userId, userId));
  return rows.length > 0;
}
