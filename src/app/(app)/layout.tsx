import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Wordmark } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line bg-paper/95 sticky top-0 z-10 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Wordmark href="/cursos" />
          <nav className="flex items-center gap-5 text-[15px]" aria-label="Principal">
            <Link href="/cursos" className="hover:text-accent">Mis cursos</Link>
            {user.role === "admin" && <Link href="/panel" className="hover:text-accent">Panel</Link>}
            <Link href="/cuenta" className="hover:text-accent">Cuenta</Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-ink-soft flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>Cyberespiración</span>
          <span>
            ¿Dudas? Escríbenos a <span className="select-all">hola@cyberespiracion.com</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
