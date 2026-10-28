import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { sendTemplate } from "@/lib/email";

export const auth = betterAuth({
  appName: "Cyberespiración",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "student", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Fase 1: las cuentas las crea el panel o la migración.
    disableSignUp: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      await sendTemplate("reset-password", {
        to: { email: user.email, name: user.name },
        userId: user.id,
        params: { name: user.name, url: passwordUrl(token) },
      });
    },
    onPasswordReset: async ({ user }) => {
      await sendTemplate("password-changed", {
        to: { email: user.email, name: user.name },
        userId: user.id,
        params: { name: user.name },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  plugins: [nextCookies()],
});

export function siteUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function passwordUrl(token: string, mode: "reset" | "activate" = "reset") {
  const q = new URLSearchParams({ token });
  if (mode === "activate") q.set("modo", "activar");
  return `${siteUrl()}/nueva-contrasena?${q.toString()}`;
}

export type Session = typeof auth.$Infer.Session;
