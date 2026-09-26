import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { AdminTabs } from "../../../components/admin-tabs";

/**
 * The House — the operator's console. Utilitarian by design: same type,
 * colour and components as the member product, none of the theatre.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-2">The House · operator console</p>
          <p className="text-[13px] text-ink-3">Every write here is re-authorized on the server and lands on the ledger.</p>
        </div>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
