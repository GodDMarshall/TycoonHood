"use client";
import { useActionState, useMemo, useState } from "react";
import { Button, Field, Input, Label, Textarea } from "@tycoonhood/ui";
import { saveProductAction, type ProductFormState } from "../app/(app)/admin/products/actions";

export interface CourseOption { id: string; title: string }

/** Mirrors the server's MERCH_TARGET_DAYS / dailyYield so the admin sees the
 *  verdict as they type. The server recomputes it on save — this is a preview,
 *  never the authority. */
interface Economics {
  thcPerDayRegular: string;
  targetMinDays: number;
  targetMaxDays: number;
  suggested: string;
  /** The house exchange rate, derived from the anchor item. */
  thcPerDollar: number;
}

const KINDS = [
  { value: "PHYSICAL", label: "Physical goods", hint: "Hoodies, chalk, equipment — anything that ships." },
  { value: "DIGITAL", label: "Digital", hint: "A guide, template or framework delivered in the library." },
  { value: "COURSE", label: "Course access", hint: "Unlocks a program in the academy on purchase." },
  { value: "MEMBERSHIP", label: "Membership", hint: "A tier of access rather than a thing." },
] as const;

const BLANK_SIZES = ["S", "M", "L", "XL", "XXL"];

export function ProductForm({ courses, economics }: { courses: CourseOption[]; economics: Economics }) {
  const [state, action, pending] = useActionState(saveProductAction, {} as ProductFormState);
  const [kind, setKind] = useState<string>("PHYSICAL");
  const [useSizes, setUseSizes] = useState(true);
  const [rows, setRows] = useState(BLANK_SIZES.map((label) => ({ label, sku: "", stock: "0", price: "" })));
  const [slug, setSlug] = useState("");
  const [priceThc, setPriceThc] = useState("");
  const [costCents, setCostCents] = useState("");
  const [priceFiat, setPriceFiat] = useState("");

  const physical = kind === "PHYSICAL";

  /**
   * Live reading as the price is typed. With a shelf price to anchor against,
   * the question is whether the two rails agree at the house rate — a small
   * item being "only twelve days of mining" is not a fault, it is a small item.
   */
  const timeReading = useMemo(() => {
    const n = Number(priceThc.replace(/[,\s]/g, ""));
    if (!priceThc.trim() || !Number.isFinite(n) || n <= 0) return null;
    const perDay = Number(economics.thcPerDayRegular);
    if (!perDay) return null;
    const days = n / perDay;
    const human = days < 45 ? `${Math.round(days)} days` : `${(days / 30).toFixed(1)} months`;

    const cents = Number(priceFiat.replace(/[,\s]/g, ""));
    if (priceFiat.trim() && Number.isFinite(cents) && cents > 0) {
      const expected = Math.round((economics.thcPerDollar * (cents / 100)) / 100) * 100;
      const ratio = n / Math.max(1, expected);
      const verdict = ratio < 0.75 ? "under" : ratio > 1.25 ? "over" : "on";
      return { human, verdict, expected, anchored: true };
    }
    const verdict =
      days < economics.targetMinDays ? "under" : days > economics.targetMaxDays ? "over" : "on";
    return { human, verdict, expected: null as number | null, anchored: false };
  }, [priceThc, priceFiat, economics]);

  const margin = useMemo(() => {
    const c = Number(costCents);
    if (!costCents.trim() || !Number.isFinite(c) || c <= 0) return null;
    return `$${(c / 100).toFixed(2)} out of pocket every time one is redeemed.`;
  }, [costCents]);

  function setRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...row, ...patch } : row)));
  }

  /**
   * SKUs are unique across the whole catalogue, so the suggestion keeps the
   * slug intact rather than truncating it — two products whose names start
   * alike must not generate the same codes.
   */
  function autoSku(label: string) {
    const base = (slug || "item").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "ITEM";
    return `${base}-${label.toUpperCase().replace(/[^A-Z0-9]+/g, "")}`.slice(0, 32).replace(/-$/, "");
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* ── Identity ───────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required placeholder="Tycoonhood Warrior Hoodie" />
        </Field>
        <Field label="Slug" htmlFor="slug">
          <Input
            id="slug" name="slug" required value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="warrior-hoodie"
          />
          <p className="mt-1 text-[11px] text-ink-3">The address it lives at. Lowercase, hyphens, never changes after launch.</p>
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" required rows={3}
          placeholder="Heavyweight 420gsm cotton. Embroidered mark, no print. Runs true to size." />
        <p className="mt-1 text-[11px] text-ink-3">This is the whole sales pitch on the storefront. Write it like you mean it.</p>
      </Field>

      {/* ── Kind ───────────────────────────────────────────────────── */}
      <fieldset>
        <Label>What is it</Label>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {KINDS.map((k) => (
            <label key={k.value}
              className={`flex cursor-pointer gap-2.5 rounded-md border p-3 ${
                kind === k.value ? "border-gold-deep bg-gold/5" : "border-line hover:border-gold-deep/40"
              }`}>
              <input type="radio" name="kind" value={k.value} checked={kind === k.value}
                onChange={() => setKind(k.value)} className="mt-0.5" />
              <span>
                <span className="block text-[13px] text-ink-1">{k.label}</span>
                <span className="block text-[11px] text-ink-3">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "COURSE" && (
        <Field label="Unlocks which program" htmlFor="grantsCourseId">
          <select id="grantsCourseId" name="grantsCourseId"
            className="w-full rounded-md border border-line bg-bg-1 px-3 py-2 text-[14px] text-ink-1">
            <option value="">Choose a program…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
      )}

      {kind === "DIGITAL" && (
        <Field label="The deliverable" htmlFor="contentMd">
          <Textarea id="contentMd" name="contentMd" rows={6}
            placeholder="# The framework&#10;&#10;Write the actual thing they are buying, in Markdown." />
          <p className="mt-1 text-[11px] text-ink-3">Rendered at /library/&lt;slug&gt; the moment they own it.</p>
        </Field>
      )}

      {/* ── Price ──────────────────────────────────────────────────── */}
      <div className="rounded-md border border-line p-4">
        <p className="eyebrow mb-3">Price</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="THC" htmlFor="priceThc">
            <Input id="priceThc" name="priceThc" inputMode="numeric" value={priceThc}
              onChange={(e) => setPriceThc(e.target.value)} placeholder={economics.suggested} />
          </Field>
          <Field label="Card, in cents" htmlFor="priceFiatCents">
            <Input id="priceFiatCents" name="priceFiatCents" inputMode="numeric" value={priceFiat}
              onChange={(e) => setPriceFiat(e.target.value)} placeholder="4900" />
            <p className="mt-1 text-[11px] text-ink-3">4900 = $49.00</p>
          </Field>
          <Field label="Your cost, in cents" htmlFor="costCents">
            <Input id="costCents" name="costCents" inputMode="numeric" value={costCents}
              onChange={(e) => setCostCents(e.target.value)} placeholder="1800" />
            <p className="mt-1 text-[11px] text-ink-3">Landed cost: goods plus shipping.</p>
          </Field>
        </div>

        {physical && timeReading && (
          <p className={`mt-3 text-[12px] ${
            timeReading.verdict === "on" ? "text-success"
            : timeReading.verdict === "under" ? "text-danger" : "text-gold-bright"
          }`}>
            {timeReading.anchored ? (<>
              {timeReading.verdict === "on" && `About ${timeReading.human} of mining — in step with the shelf price.`}
              {timeReading.verdict === "under" && `About ${timeReading.human} of mining, but the shelf price works out at around ${timeReading.expected!.toLocaleString("en-US")} THC. Cheaper in THC than in money.`}
              {timeReading.verdict === "over" && `About ${timeReading.human} of mining, while the shelf price works out at around ${timeReading.expected!.toLocaleString("en-US")} THC. Dearer in THC than in money.`}
            </>) : (<>
              {timeReading.verdict === "on" && `About ${timeReading.human} of mining. That is inside the house rule.`}
              {timeReading.verdict === "under" && `Only about ${timeReading.human} of mining — under the ${economics.targetMinDays}-day floor. Around ${Number(economics.suggested).toLocaleString("en-US")} THC would land on the rule.`}
              {timeReading.verdict === "over" && `About ${timeReading.human} of mining — past the ${economics.targetMaxDays}-day ceiling. Most members never reach it.`}
            </>)}
          </p>
        )}
        {physical && margin && <p className="mt-1.5 text-[12px] text-ink-3">{margin}</p>}
        {physical && !costCents.trim() && (
          <p className="mt-1.5 text-[12px] text-ink-3">
            No cost recorded — margin and burn rate cannot be reported without it.
          </p>
        )}
      </div>

      {/* ── Stock ──────────────────────────────────────────────────── */}
      <div className="rounded-md border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Stock</p>
          {physical && (
            <label className="flex items-center gap-2 text-[12px] text-ink-2">
              <input type="checkbox" checked={useSizes} onChange={(e) => setUseSizes(e.target.checked)} />
              It comes in sizes
            </label>
          )}
        </div>

        {physical && useSizes ? (
          <>
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[70px_1fr_80px_100px_32px] items-center gap-2">
                  <input type="hidden" name="variantId" value="" />
                  <Input name="variantLabel" value={row.label} aria-label={`Size ${i + 1} label`}
                    onChange={(e) => setRow(i, { label: e.target.value })} placeholder="M" />
                  <Input name="variantSku" value={row.sku || (row.label ? autoSku(row.label) : "")}
                    aria-label={`Size ${i + 1} SKU`}
                    onChange={(e) => setRow(i, { sku: e.target.value.toUpperCase() })} placeholder="SKU" />
                  <Input name="variantStock" value={row.stock} inputMode="numeric"
                    aria-label={`Size ${i + 1} stock`}
                    onChange={(e) => setRow(i, { stock: e.target.value })} placeholder="0" />
                  <Input name="variantPriceThc" value={row.price} inputMode="numeric"
                    aria-label={`Size ${i + 1} price override`}
                    onChange={(e) => setRow(i, { price: e.target.value })} placeholder="same" />
                  <button type="button" aria-label={`Remove size ${i + 1}`}
                    onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                    className="text-[16px] text-ink-3 hover:text-danger">×</button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button type="button" onClick={() => setRows((r) => [...r, { label: "", sku: "", stock: "0", price: "" }])}
                className="text-[12px] text-gold-bright hover:underline">+ Add a size</button>
              <span className="text-[11px] text-ink-3">
                Label · SKU · stock · price override (blank inherits)
              </span>
            </div>
          </>
        ) : (
          <Field label="Units in stock" htmlFor="inventory">
            <Input id="inventory" name="inventory" inputMode="numeric"
              placeholder={kind === "PHYSICAL" ? "25" : "leave blank for unlimited"} />
            <p className="mt-1 text-[11px] text-ink-3">
              {kind === "PHYSICAL"
                ? "Physical goods need a real number — the storefront refuses to oversell it."
                : "Blank means unlimited, which is right for anything digital."}
            </p>
          </Field>
        )}
      </div>

      <Field label="Image URL" htmlFor="image">
        <Input id="image" name="image" placeholder="https://…" />
      </Field>

      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" name="active" defaultChecked={false} />
        Live in the marketplace now
      </label>

      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      {state.message && (
        <div>
          <p className="text-[13px] text-success">{state.message}</p>
          {state.notes?.map((n, i) => (
            <p key={i} className="mt-1 text-[12px] text-ink-3">{n}</p>
          ))}
        </div>
      )}

      <Button type="submit" loading={pending} className="self-start">Save product</Button>
    </form>
  );
}
