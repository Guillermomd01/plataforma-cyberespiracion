import "server-only";
import { db, schema } from "@/db";

/* Emails de servicio. Se envían con la API transaccional de Brevo
 * desde hola@cyberespiracion.com. Las plantillas viven en el código
 * para que cualquier cambio quede en GitHub. */

type Params = Record<string, string>;

type Template = {
  subject: (p: Params) => string;
  preheader: (p: Params) => string;
  body: (p: Params) => string; // HTML del contenido
  text: (p: Params) => string;
};

const first = (name?: string) => (name ?? "").trim().split(/\s+/)[0] || "Hola";

const button = (url: string, label: string) =>
  `<p style="margin:28px 0"><a href="${url}" style="background:#2f6f62;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:6px;font-weight:600;display:inline-block">${label}</a></p>
   <p style="font-size:13px;color:#5d6b66">Si el botón no funciona, copia este enlace en el navegador:<br><span style="word-break:break-all">${url}</span></p>`;

export const templates = {
  activate: {
    subject: () => "Tu nueva plataforma de Cyberespiración",
    preheader: () => "Crea tu contraseña para entrar a tus cursos.",
    body: (p) => `
      <p>${first(p.name)}, hemos estrenado plataforma de cursos.</p>
      <p>Tus cursos y tu progreso ya están en ella. Solo tienes que crear una contraseña nueva para entrar; la de antes ya no sirve.</p>
      ${button(p.url, "Crear mi contraseña")}
      <p>El enlace caduca en 14 días. Si caduca, entra en la plataforma y pulsa «¿Olvidaste tu contraseña?».</p>`,
    text: (p) =>
      `${first(p.name)}, hemos estrenado plataforma de cursos. Tus cursos y tu progreso ya están en ella. Crea tu contraseña aquí: ${p.url} (caduca en 14 días).`,
  },
  "reset-password": {
    subject: () => "Restablece tu contraseña",
    preheader: () => "El enlace caduca en 1 hora.",
    body: (p) => `
      <p>${first(p.name)}, hemos recibido una petición para cambiar tu contraseña.</p>
      ${button(p.url, "Elegir nueva contraseña")}
      <p>El enlace caduca en 1 hora. Si no lo has pedido tú, ignora este email: tu contraseña no cambia.</p>`,
    text: (p) =>
      `${first(p.name)}, para elegir una contraseña nueva abre este enlace (caduca en 1 hora): ${p.url}. Si no lo has pedido tú, ignora este email.`,
  },
  "password-changed": {
    subject: () => "Tu contraseña ha cambiado",
    preheader: () => "Aviso de seguridad de tu cuenta.",
    body: (p) => `
      <p>${first(p.name)}, la contraseña de tu cuenta se acaba de cambiar y hemos cerrado las sesiones abiertas.</p>
      <p>Si has sido tú, no tienes que hacer nada. Si no, responde a este email y lo revisamos.</p>`,
    text: (p) =>
      `${first(p.name)}, la contraseña de tu cuenta se acaba de cambiar. Si no has sido tú, responde a este email.`,
  },
  "access-granted": {
    subject: (p) => `Ya tienes acceso a ${p.course}`,
    preheader: () => "Tu curso te espera en la plataforma.",
    body: (p) => `
      <p>${first(p.name)}, ya tienes acceso a <strong>${p.course}</strong>.</p>
      ${button(p.url, "Ir al curso")}`,
    text: (p) => `${first(p.name)}, ya tienes acceso a ${p.course}: ${p.url}`,
  },
} satisfies Record<string, Template>;

export type TemplateName = keyof typeof templates;

function layout(t: Template, p: Params) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.subject(p)}</title></head>
<body style="margin:0;background:#f1f4f1;font-family:Helvetica,Arial,sans-serif;color:#1f2a27">
<span style="display:none;max-height:0;overflow:hidden">${t.preheader(p)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f1;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px">
<tr><td style="padding:28px 32px 0;font-family:Georgia,serif;font-size:20px;color:#2f6f62">Cyberespiración</td></tr>
<tr><td style="padding:8px 32px 32px;font-size:16px;line-height:1.6">${t.body(p)}</td></tr>
</table>
<p style="font-size:12px;color:#5d6b66;max-width:560px">Recibes este email porque tienes una cuenta en la plataforma de cursos de Cyberespiración.</p>
</td></tr></table></body></html>`;
}

export async function sendTemplate(
  name: TemplateName,
  opts: { to: { email: string; name?: string }; userId?: string; params: Params },
) {
  const t: Template = templates[name];
  const apiKey = process.env.BREVO_API_KEY;
  const sender = {
    email: process.env.EMAIL_FROM ?? "hola@cyberespiracion.com",
    name: "Cyberespiración",
  };

  let status = "sent";
  let providerId: string | null = null;
  let error: string | null = null;

  if (!apiKey) {
    status = "skipped";
    console.info(`[email:${name}] (sin BREVO_API_KEY) para ${opts.to.email}`, opts.params);
  } else {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender,
          replyTo: sender,
          to: [{ email: opts.to.email, name: opts.to.name }],
          subject: t.subject(opts.params),
          htmlContent: layout(t, opts.params),
          textContent: t.text(opts.params),
          tags: [name],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
      if (!res.ok) {
        status = "failed";
        error = data.message ?? `HTTP ${res.status}`;
      } else {
        providerId = data.messageId ?? null;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  await db.insert(schema.emailLog).values({
    userId: opts.userId ?? null,
    template: name,
    toEmail: opts.to.email,
    status,
    providerId,
    error,
  });

  return { ok: status !== "failed", status, error };
}
