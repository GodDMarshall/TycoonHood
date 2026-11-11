/** Admin → Community: discussion categories and groups (create, edit, archive). */
import Link from "next/link";
import { discussions, type DiscussionViewer } from "@tycoonhood/core";
import { Badge, Button, Input, Label, Select, Textarea } from "@tycoonhood/ui";
import { Panel, SectionTitle } from "../../../../components/app/page";
import { ActionForm } from "../../../../components/admin/action-form";
import { archiveDiscussionAction, saveCategoryAction, saveGroupAction } from "./actions";

const PILLARS = [
  ["", "None"],
  ["WARRIOR", "Warrior"],
  ["BUILDER", "Builder"],
  ["TYCOON", "Tycoon"],
  ["MIND", "Mind"],
] as const;

function CategoryFields({ c }: { c?: { id: string; slug: string; name: string; description: string | null; sortOrder: number } }) {
  const k = c?.id ?? "new";
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-name-${k}`}>Name</Label>
          <Input id={`cat-name-${k}`} name="name" required maxLength={60} defaultValue={c?.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-slug-${k}`}>Address</Label>
          <Input id={`cat-slug-${k}`} name="slug" required maxLength={60} defaultValue={c?.slug} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cat-sort-${k}`}>Order</Label>
          <Input id={`cat-sort-${k}`} name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 100} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cat-desc-${k}`}>Description</Label>
        <Input id={`cat-desc-${k}`} name="description" maxLength={300} defaultValue={c?.description ?? ""} />
      </div>
    </>
  );
}

function GroupFields({ g }: { g?: { id: string; slug: string; name: string; description: string; pillar: string | null } }) {
  const k = g?.id ?? "new";
  return (
    <>
      {g && <input type="hidden" name="id" value={g.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`grp-name-${k}`}>Name</Label>
          <Input id={`grp-name-${k}`} name="name" required maxLength={60} defaultValue={g?.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`grp-slug-${k}`}>Address</Label>
          <Input id={`grp-slug-${k}`} name="slug" required maxLength={60} defaultValue={g?.slug} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`grp-pillar-${k}`}>Pillar</Label>
          <Select id={`grp-pillar-${k}`} name="pillar" defaultValue={g?.pillar ?? ""}>
            {PILLARS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`grp-desc-${k}`}>Description</Label>
        <Textarea id={`grp-desc-${k}`} name="description" required rows={2} maxLength={1000} defaultValue={g?.description} />
      </div>
    </>
  );
}

export async function DiscussionsAdmin({ viewer }: { viewer: DiscussionViewer }) {
  const [categories, groups] = await Promise.all([discussions.categories({ includeArchived: true }), discussions.groups(viewer, { includeArchived: true })]);
  return (
    <>
      <section aria-labelledby="categories">
        <SectionTitle id="categories">Discussion categories</SectionTitle>
        <Panel as="ul" className="divide-y divide-line">
          {categories.length === 0 && <li className="p-5 text-[14px] text-ink-3">No categories yet. Run the community seed or create one below.</li>}
          {categories.map((c) => (
            <li key={c.id} className={c.archived ? "p-5 text-ink-3" : "p-5"}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-[14.5px]">
                    <Link href={`/community/discussions?c=${c.slug}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="ml-2 text-[12.5px] tabular-nums text-ink-3">
                      {c.posts} {c.posts === 1 ? "post" : "posts"} · order {c.sortOrder}
                    </span>
                    {c.archived && (
                      <Badge tone="warning" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </span>
                  <span className="text-[13px] text-ink-3">Edit</span>
                </summary>
                <div className="mt-4 flex flex-col gap-3">
                  <ActionForm action={saveCategoryAction} submit="Save category">
                    <CategoryFields c={c} />
                  </ActionForm>
                  <form action={archiveDiscussionAction.bind(null, "category", c.id, !c.archived)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {c.archived ? "Restore" : "Archive"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </Panel>
        <Panel className="mt-4 p-5">
          <h3 className="mb-4 text-[15px] font-semibold">New category</h3>
          <ActionForm action={saveCategoryAction} submit="Create category">
            <CategoryFields />
          </ActionForm>
        </Panel>
      </section>

      <section aria-labelledby="groups">
        <SectionTitle id="groups">Groups</SectionTitle>
        <Panel as="ul" className="divide-y divide-line">
          {groups.length === 0 && <li className="p-5 text-[14px] text-ink-3">No groups yet.</li>}
          {groups.map((g) => (
            <li key={g.id} className={g.archived ? "p-5 text-ink-3" : "p-5"}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-[14.5px]">
                    <Link href={`/community/groups/${g.slug}`} className="font-medium hover:underline">
                      {g.name}
                    </Link>
                    <span className="ml-2 text-[12.5px] tabular-nums text-ink-3">
                      {g.members} members · {g.posts} posts
                    </span>
                    {g.archived && (
                      <Badge tone="warning" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </span>
                  <span className="text-[13px] text-ink-3">Edit</span>
                </summary>
                <div className="mt-4 flex flex-col gap-3">
                  <ActionForm action={saveGroupAction} submit="Save group">
                    <GroupFields g={g} />
                  </ActionForm>
                  <form action={archiveDiscussionAction.bind(null, "group", g.id, !g.archived)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {g.archived ? "Restore" : "Archive"}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </Panel>
        <Panel className="mt-4 p-5">
          <h3 className="mb-4 text-[15px] font-semibold">New group</h3>
          <ActionForm action={saveGroupAction} submit="Create group">
            <GroupFields />
          </ActionForm>
        </Panel>
      </section>
    </>
  );
}
