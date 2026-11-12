import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { DELETION_TOPIC, getSetting, HOME_SECTIONS, HOME_SECTION_LABEL, ROLES, ROLE_LABEL } from "@tycoonhood/core";
import { Badge, Card, CardContent, Field, Input, SectionRule, Select, Textarea } from "@tycoonhood/ui";
import { ActionForm } from "../../../../components/admin/action-form";
import { ConfirmButton } from "../../../../components/admin-confirm";
import {
  announceAction,
  deleteTestimonialAction,
  saveContactSettingsAction,
  saveHomeAction,
  savePlatformSettingsAction,
  saveTestimonialAction,
  setContactHandledAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin · Site & CMS" };
export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const check = "accent-[var(--color-gold)]";

export default async function AdminSite({ searchParams }: { searchParams: Promise<{ inbox?: string }> }) {
  await requirePermission("admin.content");
  const { inbox } = await searchParams;
  const showHandled = inbox === "all";
  const [home, contact, platform, testimonials, messages, unhandled, roleCounts, activeMembers] = await Promise.all([
    getSetting("home"),
    getSetting("contact"),
    getSetting("platform"),
    prisma.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.contactMessage.findMany({
      where: showHandled ? {} : { handled: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      // A deletion request names its account: staff write to the address it has now.
      include: { user: { select: { email: true } } },
    }),
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.user.groupBy({ by: ["role"], where: { suspendedAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { suspendedAt: null } }),
  ]);

  return (
    <main>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Site &amp; CMS</h2>
      <p className="mt-1 text-[14px] text-ink-3">Homepage copy, contact details, member stories, the inbox, platform switches and announcements. Every save is audited.</p>

      {/* ─── Homepage ─── */}
      <SectionRule label="Homepage" className="mb-4 mt-8" />
      <Card>
        <CardContent className="py-5">
          <ActionForm action={saveHomeAction} submit="Save homepage">
            <Field label="Eyebrow" htmlFor="heroEyebrow" hint="The small line above the headline.">
              <Input id="heroEyebrow" name="heroEyebrow" defaultValue={home.heroEyebrow} maxLength={80} required />
            </Field>
            <Field label="Headline — one line per row (up to 4)" htmlFor="heroLines" hint="The last line is set in the accent face.">
              <Textarea id="heroLines" name="heroLines" defaultValue={home.heroLines.join("\n")} rows={4} required />
            </Field>
            <Field label="Lead paragraph" htmlFor="heroLead">
              <Textarea id="heroLead" name="heroLead" defaultValue={home.heroLead} rows={3} maxLength={400} required />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[13px] font-medium text-ink-1">Sections shown</legend>
              {HOME_SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-3 text-[14px] text-ink-2">
                  <input type="checkbox" name={`section:${s}`} defaultChecked={home.sections[s]} className={check} />
                  {HOME_SECTION_LABEL[s]}
                </label>
              ))}
            </fieldset>
          </ActionForm>
        </CardContent>
      </Card>

      {/* ─── Platform ─── */}
      <SectionRule label="Platform" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-5">
          <ActionForm action={savePlatformSettingsAction} submit="Save platform settings">
            <label className="flex items-center gap-3 text-[14px] text-ink-1">
              <input type="checkbox" name="signupsOpen" defaultChecked={platform.signupsOpen} className={check} />
              New sign-ups are open
            </label>
            <Field label="Site-wide banner" htmlFor="maintenanceBanner" hint="Shown across the website and app. Leave empty for none.">
              <Input id="maintenanceBanner" name="maintenanceBanner" defaultValue={platform.maintenanceBanner} maxLength={240} />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>

      {/* ─── Contact ─── */}
      <SectionRule label="Contact page" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-5">
          <ActionForm action={saveContactSettingsAction} submit="Save contact settings">
            <Field label="Support email" htmlFor="supportEmail" hint="Shown on /contact. Leave empty to show only the form.">
              <Input id="supportEmail" name="supportEmail" type="email" defaultValue={contact.supportEmail} />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>

      {/* ─── Inbox ─── */}
      <SectionRule label={`Inbox · ${unhandled} unhandled`} className="mb-4 mt-10" />
      <div id="inbox" className="scroll-mt-24">
        <p className="mb-3 text-[13px]">
          {showHandled ? (
            <a href="/admin/site#inbox" className="text-gold hover:text-gold-bright">Show unhandled only</a>
          ) : (
            <a href="/admin/site?inbox=all#inbox" className="text-gold hover:text-gold-bright">Show handled too</a>
          )}
        </p>
        {messages.length === 0 ? (
          <p className="text-[14px] text-ink-3">{showHandled ? "No messages yet." : "Nothing waiting. Every message has been handled."}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id}>
                <Card variant={m.handled ? "default" : "raised"}>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={m.topic === DELETION_TOPIC ? "danger" : "neutral"}>{m.topic === DELETION_TOPIC ? "Account deletion" : m.topic}</Badge>
                      {m.handled && <Badge tone="success">Handled</Badge>}
                      <span className="text-[12.5px] text-ink-3">{dt.format(m.createdAt)}</span>
                    </div>
                    <p className="text-[14px] text-ink-1">
                      {m.name} · <a href={`mailto:${m.user?.email ?? m.email}`} className="text-gold hover:text-gold-bright">{m.user?.email ?? m.email}</a>
                    </p>
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{m.message}</p>
                    <form action={setContactHandledAction.bind(null, m.id, !m.handled)}>
                      <button type="submit" className="text-[13px] text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                        {m.handled ? "Reopen" : "Mark handled"}
                      </button>
                    </form>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── Member stories ─── */}
      <SectionRule label="Member stories" className="mb-4 mt-10" />
      <p className="mb-4 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-2">
        Real members only, in their words, with their permission. A story needs the date the member gave consent before it can be saved. Published stories appear on
        /success-stories and the homepage; the homepage section stays hidden while none are published.
      </p>
      <div className="flex flex-col gap-4">
        {testimonials.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2">
                <Badge tone={t.published ? "success" : "neutral"}>{t.published ? "Published" : "Draft"}</Badge>
                <span className="text-[13px] text-ink-3">{t.name}</span>
              </div>
              <TestimonialFields action={saveTestimonialAction.bind(null, t.id)} t={t} submit="Save story" />
              <div>
                <ConfirmButton action={deleteTestimonialAction.bind(null, t.id)} label="Delete story" confirmText={`Remove ${t.name}'s story permanently.`} variant="ghost" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card variant="raised">
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="text-[14px] font-medium">Add a story</p>
            <TestimonialFields action={saveTestimonialAction.bind(null, null)} submit="Add story" />
          </CardContent>
        </Card>
      </div>

      {/* ─── Announcements ─── */}
      <SectionRule label="Send an announcement" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-5">
          <ActionForm action={announceAction} submit="Send notification">
            <p className="text-[13.5px] text-ink-2">
              Puts a notification in members&rsquo; inboxes (type: system). It cannot be unsent. Suspended accounts are skipped.
            </p>
            <Field label="Audience" htmlFor="role">
              <Select id="role" name="role" defaultValue="">
                <option value="">Everyone ({activeMembers.toLocaleString()})</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]} ({(roleCounts.find((c) => c.role === r)?._count._all ?? 0).toLocaleString()})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Title" htmlFor="a-title">
              <Input id="a-title" name="title" maxLength={120} required />
            </Field>
            <Field label="Message (optional)" htmlFor="a-body">
              <Textarea id="a-body" name="body" rows={3} maxLength={1000} />
            </Field>
            <Field label="Link (optional)" htmlFor="a-href" hint="A path on this site, like /learning.">
              <Input id="a-href" name="href" placeholder="/learning" maxLength={300} />
            </Field>
            <label className="flex items-center gap-3 text-[14px] text-ink-1">
              <input type="checkbox" name="confirm" className={check} />
              I have checked the audience and the wording.
            </label>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}

function TestimonialFields({
  action,
  t,
  submit,
}: {
  action: (prev: { ok?: string; error?: string }, fd: FormData) => Promise<{ ok?: string; error?: string }>;
  t?: { name: string; role: string | null; quote: string; consentAt: Date; published: boolean; sortOrder: number };
  submit: string;
}) {
  const id = t ? undefined : "new";
  return (
    <ActionForm action={action} submit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Member's name (as they agreed to be shown)" htmlFor={id && `${id}-name`}>
          <Input id={id && `${id}-name`} name="name" defaultValue={t?.name} maxLength={80} required />
        </Field>
        <Field label="Role or context (optional)" htmlFor={id && `${id}-role`}>
          <Input id={id && `${id}-role`} name="role" defaultValue={t?.role ?? ""} maxLength={120} placeholder="e.g. Student, Builder programme" />
        </Field>
      </div>
      <Field label="Their story, in their words" htmlFor={id && `${id}-quote`}>
        <Textarea id={id && `${id}-quote`} name="quote" defaultValue={t?.quote} rows={3} maxLength={2000} required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Consent given on" htmlFor={id && `${id}-consent`}>
          <Input id={id && `${id}-consent`} name="consentAt" type="date" defaultValue={t ? isoDate(t.consentAt) : ""} required />
        </Field>
        <Field label="Order" htmlFor={id && `${id}-order`}>
          <Input id={id && `${id}-order`} name="sortOrder" type="number" min={0} defaultValue={t?.sortOrder ?? 0} />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-[14px] text-ink-1">
        <input type="checkbox" name="published" defaultChecked={t?.published ?? false} className={check} />
        Published
      </label>
    </ActionForm>
  );
}
