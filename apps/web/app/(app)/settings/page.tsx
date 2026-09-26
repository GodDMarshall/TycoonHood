import type { Metadata } from "next";
import { RoomHeader } from "../../../components/room-header";
import { requireUser } from "../../../lib/guard";
import { prisma } from "@tycoonhood/db";
import { activeDiscordTransport, discord, sessions } from "@tycoonhood/core";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, SectionRule } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";
import { generateLinkCodeAction, savePrivacyAction, signOutEverywhereAction, unlinkDiscordAction } from "./actions";
import { LinkCodeGenerator } from "../../../components/link-code";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";
const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function SettingsPage() {
  await requireUser();
  const user = (await getCurrentUser())!;
  const [deviceSessions, link, profile] = await Promise.all([
    sessions.listForUser(user.id),
    discord.linkFor(user.id),
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
  ]);
  const privacy = (profile.privacy ?? {}) as Record<string, boolean>;
  const transport = activeDiscordTransport();

  return (
    <main className="max-w-2xl">
      <RoomHeader compact icon="settings" room="Settings" title="Your" accent="house rules." lead="Devices, Discord and exactly what the rest of the house can see about you." />

      <SectionRule label="Devices" className="mb-4" />
      <Card>
        <CardContent className="flex flex-col py-2">
          {deviceSessions.map((s) => (
            <div key={s.id} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink-1">{s.userAgent?.slice(0, 72) ?? "Unknown device"}</span>
                <span className="figures block text-[11px] text-ink-3">since {dt.format(s.createdAt)} · expires {dt.format(s.expires)}</span>
              </span>
            </div>
          ))}
          <form action={signOutEverywhereAction} className="py-3">
            <Button variant="outline" size="sm" type="submit">Sign out everywhere</Button>
          </form>
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

      <SectionRule label="Leaderboard privacy" className="mb-4 mt-10" />
      <Card>
        <CardContent className="py-4">
          <form action={savePrivacyAction} className="flex flex-col gap-3">
            {[["level", "Show my level and XP"], ["rank", "Show my rank"], ["streak", "Show my streak"]].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-[14px] text-ink-1">
                <input type="checkbox" name={key} defaultChecked={privacy[key] !== false} className="accent-[#c9a227]" />
                {label}
              </label>
            ))}
            <div>
              <Button size="sm" type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
