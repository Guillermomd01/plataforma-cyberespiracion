import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { signedFileUrl } from "@/lib/files";

export const metadata: Metadata = { title: "Archivos" };
export const dynamic = "force-dynamic";

async function check(path: string) {
  const url = signedFileUrl(path);
  if (!url) return "sin-config" as const;
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok ? ("ok" as const) : (res.status as number);
  } catch {
    return "error" as const;
  }
}

export default async function Page() {
  await requireAdmin();
  const files = await db
    .select({ id: schema.assets.id, title: schema.assets.title, path: schema.assets.storagePath, kind: schema.assets.kind })
    .from(schema.assets)
    .orderBy(asc(schema.assets.storagePath));
  const results = await Promise.all(files.map(async (f) => ({ ...f, status: await check(f.path) })));
  const bad = results.filter((r) => r.status !== "ok");

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/panel" className="text-sm text-ink-soft hover:text-accent">← Alumnos</Link>
      <h1 className="text-4xl mt-4 mb-2">Archivos</h1>
      <p className="text-ink-soft mb-8 tabular-nums">
        {results.length - bad.length} de {results.length} audios y PDF disponibles en Bunny.
      </p>
      {bad.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-5">Todos los archivos responden correctamente.</p>
      ) : (
        <ul className="rounded-lg border border-line bg-surface divide-y divide-line">
          {bad.map((r) => (
            <li key={r.id} className="px-4 py-3 flex flex-wrap justify-between gap-2">
              <span>
                {r.title}
                <span className="block text-sm text-ink-soft break-all">{r.path}</span>
              </span>
              <span className="text-danger text-sm">
                {r.status === 404 ? "No está en Bunny" : r.status === 403 ? "Acceso denegado" : `Error (${r.status})`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
