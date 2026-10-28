import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-display text-xl text-accent">
      Cyberespiración
    </Link>
  );
}

export function AuthShell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10"><Wordmark /></div>
        <h1 className="text-3xl mb-3">{title}</h1>
        {intro && <div className="text-ink-soft mb-8">{intro}</div>}
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block mb-5">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none"
      />
      {hint && <span className="block text-sm text-ink-soft mt-1.5">{hint}</span>}
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const styles = {
    primary: "bg-accent text-accent-ink hover:opacity-90",
    quiet: "border border-line bg-surface text-ink hover:border-ink-soft",
    danger: "border border-danger text-danger hover:bg-danger-soft",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[15px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "bg-accent-soft text-ink",
    error: "bg-danger-soft text-danger",
    success: "bg-accent-soft text-ink",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-md px-3.5 py-3 text-sm mb-5 ${styles}`}>
      {children}
    </p>
  );
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progreso"}>
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-ink-soft mt-2 tabular-nums">
        {done} de {total} lecciones · {pct}%
      </p>
    </div>
  );
}
