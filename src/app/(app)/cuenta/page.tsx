import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AccountForms } from "./forms";

export const metadata: Metadata = { title: "Cuenta" };

export default async function Page() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-4xl mb-2">Tu cuenta</h1>
      <p className="text-ink-soft mb-10">{user.email}</p>
      <AccountForms name={user.name} />
    </main>
  );
}
