import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/guard";
import { prisma, type Prisma, type UserRole } from "@tycoonhood/db";
import { ROLES, ROLE_LABEL } from "@tycoonhood/core";
import { Badge, Button, Input, Select } from "@tycoonhood/ui";

export const metadata: Metadata = { title: "Admin · Members" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;
const dt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

export default async function AdminMembers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  await requirePermission("admin.users");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const role = (ROLES as readonly string[]).includes(sp.role ?? "") ? (sp.role as UserRole) : undefined;
  const status = sp.status === "suspended" || sp.status === "unverified" ? sp.status : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { profile: { username: { contains: q, mode: "insensitive" } } },
            { profile: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(status === "suspended" ? { suspendedAt: { not: null } } : status === "unverified" ? { emailVerified: null } : {}),
  };

  const [total, members] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        createdAt: true,
        emailVerified: true,
        suspendedAt: true,
        profile: { select: { username: true, displayName: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/members${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Members</h2>
      <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search email, username, name…" />
        <label className="sr-only" htmlFor="role">Role</label>
        <Select id="role" name="role" defaultValue={role ?? ""}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="status">Status</label>
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Any status</option>
          <option value="unverified">Email not verified</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <p className="mt-4 text-[13px] text-ink-3">
        {total === 0 ? "No members match." : `${total.toLocaleString()} ${total === 1 ? "member" : "members"} · page ${page} of ${pages}`}
      </p>

      {members.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="bg-bg-1 text-[12.5px] text-ink-3">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Member</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-bg-1">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="font-medium text-ink-1 hover:text-gold-bright">
                      {m.profile?.displayName ?? m.name ?? m.email}
                    </Link>
                    <span className="block text-[12px] text-ink-3">
                      {m.profile ? `@${m.profile.username} · ` : ""}
                      {m.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={m.role === "ADMIN" ? "gold" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {m.suspendedAt ? <Badge tone="danger">Suspended</Badge> : null}
                      {m.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] tabular-nums text-ink-2">{dt.format(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-[14px]">
          {page > 1 ? <Link href={href(page - 1)} className="text-gold hover:text-gold-bright">← Newer</Link> : <span className="text-ink-3">← Newer</span>}
          {page < pages ? <Link href={href(page + 1)} className="text-gold hover:text-gold-bright">Older →</Link> : <span className="text-ink-3">Older →</span>}
        </nav>
      )}
    </main>
  );
}
