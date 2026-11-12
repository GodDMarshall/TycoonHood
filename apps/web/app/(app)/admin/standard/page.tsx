import type { Metadata } from "next";
import { prisma } from "@tycoonhood/db";
import { AUTO_EVENTS, standard } from "@tycoonhood/core";
import { Badge, Button, Input, Label, Select } from "@tycoonhood/ui";
import { requireAdmin } from "../../../../lib/guard";
import { Panel, SectionTitle } from "../../../../components/app/page";
import { ActionForm } from "../../../../components/admin/action-form";
import { saveHouseItemAction, setHouseItemActiveAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Daily standard" };
export const dynamic = "force-dynamic";

const AUTO_LABEL: Record<string, string> = { LESSON_COMPLETED: "Completing a lesson" };

function ItemFields({ item }: { item?: { id: string; title: string; detail: string | null; autoEvent: string | null; sortOrder: number } }) {
  const k = item?.id ?? "new";
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`t-${k}`}>Item</Label>
          <Input id={`t-${k}`} name="title" required maxLength={60} defaultValue={item?.title} placeholder="Train" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`d-${k}`}>Detail</Label>
          <Input id={`d-${k}`} name="detail" maxLength={140} defaultValue={item?.detail ?? ""} placeholder="30 minutes of deliberate physical training." />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`a-${k}`}>Ticks itself from</Label>
          <Select id={`a-${k}`} name="autoEvent" defaultValue={item?.autoEvent ?? ""}>
            <option value="">Nothing — the member ticks it</option>
            {AUTO_EVENTS.map((e) => (
              <option key={e} value={e}>
                {AUTO_LABEL[e] ?? e}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`s-${k}`}>Order</Label>
          <Input id={`s-${k}`} name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 10} />
        </div>
      </div>
    </>
  );
}

export default async function AdminStandard() {
  await requireAdmin();
  const [items, metToday, members] = await Promise.all([
    standard.houseItems(),
    prisma.standardDay.count({ where: { day: { gte: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z") } } }),
    prisma.standardItem.groupBy({ by: ["userId"], where: { userId: { not: null }, active: true } }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-[20px] font-semibold">The daily standard</h2>
        <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">
          What every member is asked to do every day. Members may add up to five items of their own on top; they cannot remove these. A day counts as met
          when every item is ticked, and that advances the streak. Changes apply from each member&rsquo;s next visit; days already met stay met.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-3">
          <span className="tabular-nums text-ink-1">{metToday}</span> met today (UTC) ·{" "}
          <span className="tabular-nums text-ink-1">{members.length}</span> members hold items of their own
        </p>
      </div>

      <section aria-labelledby="items">
        <SectionTitle id="items">House items</SectionTitle>
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Panel key={item.id} className={item.active ? "p-5" : "p-5 opacity-60"}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {!item.active && <Badge tone="neutral">Retired</Badge>}
                  {item.autoEvent && <Badge tone="gold">Automatic</Badge>}
                </span>
                <form action={setHouseItemActiveAction.bind(null, item.id, !item.active)}>
                  <Button type="submit" size="sm" variant="ghost">
                    {item.active ? "Retire" : "Restore"}
                  </Button>
                </form>
              </div>
              <ActionForm action={saveHouseItemAction} submit="Save">
                <ItemFields item={item} />
              </ActionForm>
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="new">
        <SectionTitle id="new">Add an item</SectionTitle>
        <Panel className="p-5">
          <ActionForm action={saveHouseItemAction} submit="Add to the standard">
            <ItemFields />
          </ActionForm>
        </Panel>
      </section>
    </div>
  );
}
