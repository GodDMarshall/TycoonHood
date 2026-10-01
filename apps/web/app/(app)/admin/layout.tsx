import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { AdminTabs } from "../../../components/admin-tabs";
import { Page } from "../../../components/app/page";

/**
 * The House — the operator's console. Utilitarian by design: same type,
 * colour and components as the member product, none of the theatre.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/today");
  return (
    <Page width="wide">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Admin</h1>
        <p className="mt-1 text-[14px] text-ink-3">Every write here is re-authorized on the server and lands on the ledger.</p>
      </div>
      <AdminTabs />
      {children}
    </Page>
  );
}
