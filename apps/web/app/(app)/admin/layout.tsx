import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  const tabs = [
    ["/admin", "Overview"],
    ["/admin/members", "Members"],
    ["/admin/economy", "Economy"],
    ["/admin/content", "Content"],
    ["/admin/missions", "Missions"],
    ["/admin/products", "Products"],
    ["/admin/videos", "Videos"],
    ["/admin/challenges", "Challenges"],
    ["/admin/orders", "Orders"],
  ];
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-1 rounded-lg border border-gold-deep/40 bg-gold/5 p-1">
        <span className="eyebrow px-3 text-gold">The house</span>
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-[13px] text-ink-2 hover:bg-gold/10 hover:text-ink-1">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
