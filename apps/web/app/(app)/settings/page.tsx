import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHeader } from "../../../components/app/page";
import { requireUser } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { accountSettings, activeDiscordTransport, discord, privacyShows, profileCompletion, sessions } from "@tycoonhood/core";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Notice, SectionRule, Select, Textarea } from "@tycoonhood/ui";
import { getCurrentSession } from "../../../lib/auth";
import { mailMode } from "../../../lib/mail";
import { verifyLinkStateFor } from "../../../lib/mail/verification";
import {
  changeEmailAction,
  changePasswordAction,
  generateLinkCodeAction,
  requestDeletionAction,
  resendVerificationAction,
  savePrivacyAction,
  signOutEverywhereAction,
  signOutOtherDevicesAction,
  unlinkDiscordAction,
  updateProfileAction,
} from "./actions";
import { LinkCodeGenerator } from "../../../components/link-code";
import { ActionForm } from "../../../components/admin/action-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function timeZones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

export default async function SettingsPage() {
  await requireUser();
  const session = (await getCurrentSession())!;
  const user = session.user;
  const [deviceSessions, link, profile, pendingDeletion, confirmLink] = await Promise.all([
    sessions.listForUser(user.id),
    discord.linkFor(user.id),
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
    accountSettings.pendingDeletion(user.id),
    user.emailVerified ? null : verifyLinkStateFor(user.email),
  ]);
  const mail = mailMode();
  const contact = <Link href="/contact" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">contact us</Link>;
  const transport = activeDiscordTransport();
  const completion = profileCompletion({ emailVerified: user.emailVerified, profile });
  const zones = timeZones();
  const otherDevices = deviceSessions.filter((s) => s.id !== session.id).length;

  return (
    <Page width="narrow">
      <PageHeader
        title="Settings"
        description="Your profile, your sign-in details, your devices, and exactly what other members can see about you."
      />

      <SectionRule label="Profile" className="mb-4" />
      <Card id="profile" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            Public profile
            <Badge tone={completion.score === 100 ? "success" : "neutral"}>{completion.score}% complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateProfileAction} submit="Save profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" htmlFor="displayName">
                <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={60} required />
              </Field>
              <Field label="Username" htmlFor="username" hint="3–20 characters: letters, numbers, underscores.">
                <Input id="username" name="username" defaultValue={profile.username} maxLength={20} required />
              </Field>
            </div>
            <Field label="Bio" htmlFor="bio" hint="Up to 500 characters. Shown on your public profile.">
              <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} rows={3} />
            </Field>
            <Field label="Profile photo URL" htmlFor="avatarUrl" hint="A link to an image, starting with https://.">
              <Input id="avatarUrl" name="avatarUrl" type="url" inputMode="url" defaultValue={profile.avatarUrl ?? ""} placeholder="https://" />
            </Field>
            <Field label="Time zone" htmlFor="timezone" hint="Your day — and your streak — turn over at midnight here.">
              <Select id="timezone" name="timezone" defaultValue={profile.timezone ?? ""}>
                <option value="">Not set (UTC)</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </Field>
          </ActionForm>
          <p className="mt-4 text-[13px] text-ink-3">
            Your public page:{" "}
            <Link href={`/u/${profile.username}`} className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              /u/{profile.username}
            </Link>
          </p>
        </CardContent>
      </Card>

      <SectionRule label="Email" className="mb-4 mt-10" />
      <Card id="email" className="scroll-mt-24">
        <CardContent className="flex flex-col gap-5 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-1">{user.email}</span>
            {user.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Not verified</Badge>}
          </div>
          {confirmLink === "off" && (
            <p className="text-[13px] text-ink-2">
              We couldn&rsquo;t send you a confirmation link: email isn&rsquo;t available right now. Try again later, or {contact}.
            </p>
          )}
          {confirmLink && confirmLink !== "off" && (
            <ActionForm action={resendVerificationAction} submit={confirmLink === "unsent" ? "Send a new link" : "Resend confirmation email"}>
              <p className="text-[13px] text-ink-2">
                {confirmLink === "sent" && <>We sent a confirmation link to this address. </>}
                {confirmLink === "logged" && <>Dev mode: nothing was emailed. The confirmation link for this address is in the server log. </>}
                {confirmLink === "unsent" && <>We couldn&rsquo;t send a confirmation link to this address, or it has expired. Send a new one, or {contact}. </>}
                Links work for 24 hours, and you can ask for up to three an hour.
              </p>
            </ActionForm>
          )}
          <div className="border-t border-line pt-5">
            <p className="mb-3 text-[14px] font-medium text-ink-1">Change email</p>
            <ActionForm action={changeEmailAction} submit="Change email">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New email" htmlFor="new-email">
                  <Input id="new-email" name="email" type="email" autoComplete="email" required />
                </Field>
                <Field label="Current password" htmlFor="email-password">
                  <Input id="email-password" name="password" type="password" autoComplete="current-password" required />
                </Field>
              </div>
              <p className="text-[12.5px] text-ink-3">
                {mail === "live" && <>The new address starts unverified; we&rsquo;ll send it a confirmation link.</>}
                {mail === "dev" && <>The new address starts unverified. Dev mode: its confirmation link goes to the server log, not by email.</>}
                {mail === "off" && <>The new address starts unverified. Email isn&rsquo;t available right now, so we can&rsquo;t send it a confirmation link yet.</>}
              </p>
            </ActionForm>
          </div>
        </CardContent>
      </Card>

      <SectionRule label="Password" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-5">
          <ActionForm action={changePasswordAction} submit="Change password">
            <Field label="Current password" htmlFor="currentPassword">
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" htmlFor="newPassword" hint="At least 10 characters.">
                <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
              </Field>
              <Field label="Repeat new password" htmlFor="confirm">
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
              </Field>
            </div>
            <p className="text-[12.5px] text-ink-3">Changing your password signs out every other device. This one stays signed in.</p>
          </ActionForm>
        </CardContent>
      </Card>

      <SectionRule label="Devices" className="mb-4 mt-10" />
      <Card>
        <CardContent className="flex flex-col py-2">
          {deviceSessions.map((s) => (
            <div key={s.id} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink-1">
                  {s.userAgent?.slice(0, 72) ?? "Unknown device"}
                  {s.id === session.id && <span className="ml-2 text-[12px] text-success">This device</span>}
                </span>
                <span className="figures block text-[11px] text-ink-3">since {dt.format(s.createdAt)} · expires {dt.format(s.expires)}</span>
              </span>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 py-3">
            {otherDevices > 0 && (
              <form action={signOutOtherDevicesAction}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out {otherDevices === 1 ? "the other device" : `the other ${otherDevices} devices`}
                </Button>
              </form>
            )}
            <form action={signOutEverywhereAction}>
              <Button variant="ghost" size="sm" type="submit">Sign out everywhere</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <SectionRule label="Discord" className="mb-4 mt-10" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Community link
            <Badge tone={transport.live ? "success" : "neutral"}>
              {transport.live ? "Bot live" : "Bot not configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {link ? (
            <>
              <p className="text-[14px] text-ink-1">
                Linked to Discord ID <span className="figures">{link.discordUserId}</span>
              </p>
              <p className="text-[12px] text-ink-3">
                Your rank role syncs when the bot is live{transport.live ? "" : " — it is not on this deployment, and nothing here will pretend otherwise"}.
              </p>
              <form action={unlinkDiscordAction}>
                <Button variant="ghost" size="sm" type="submit">Unlink</Button>
              </form>
            </>
          ) : (
            <LinkCodeGenerator action={generateLinkCodeAction} />
          )}
        </CardContent>
      </Card>

      <SectionRule label="Your public profile card" className="mb-4 mt-10" />
      <Card id="privacy" className="scroll-mt-24">
        <CardContent className="py-4">
          <form action={savePrivacyAction} className="flex flex-col gap-3">
            {[
              ["level", "Show my level and XP"],
              ["rank", "Show my rank"],
              ["streak", "Show my streak"],
              ["leaderboard", "Show me on the leaderboard"],
              ["courses", "Show my certificates, and my name when someone verifies one"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-[14px] text-ink-1">
                <input type="checkbox" name={key} defaultChecked={privacyShows(profile.privacy, key)} className="accent-[var(--color-gold)]" />
                {label}
              </label>
            ))}
            <div>
              <Button size="sm" type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SectionRule label="Delete account" className="mb-4 mt-10" />
      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          {pendingDeletion ? (
            <Notice tone="warning" title="Deletion requested">
              We received your request on {dt.format(pendingDeletion.createdAt)}. Staff will email {user.email} before anything is removed. To cancel, contact us.
            </Notice>
          ) : (
            <ActionForm action={requestDeletionAction} submit="Request deletion">
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                This sends a deletion request to staff. Your profile and personal details are removed; ledger and order records are kept in anonymised
                form, because the books must still balance (see the{" "}
                <Link href="/privacy" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">Privacy Policy</Link>).
              </p>
              <Field label="Anything you'd like us to know? (optional)" htmlFor="delete-note">
                <Textarea id="delete-note" name="note" rows={2} maxLength={1000} />
              </Field>
              <label className="flex items-center gap-3 text-[14px] text-ink-1">
                <input type="checkbox" name="confirm" className="accent-[var(--color-gold)]" />
                I want my account deleted.
              </label>
            </ActionForm>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
