"use client";
import { useActionState, useState } from "react";
import { Button, Input } from "@tycoonhood/ui";
import type { ShipState } from "../app/(app)/admin/actions";

type Bound = (prev: ShipState, fd: FormData) => Promise<ShipState>;

const CARRIERS = ["India Post", "Delhivery", "Blue Dart", "DTDC", "DHL", "FedEx", "UPS", "Royal Mail", "USPS"];

export function ShipForm({ action }: { action: Bound }) {
  const [state, form, pending] = useActionState(action, {} as ShipState);
  const [open, setOpen] = useState(false);

  if (state.message) return <p className="text-[12px] text-success">{state.message}</p>;

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Ship it
      </Button>
    );
  }

  return (
    <form action={form} className="flex flex-wrap items-center gap-2">
      <Input name="carrier" list="carriers" required placeholder="Carrier" className="w-[130px]" aria-label="Carrier" />
      <datalist id="carriers">
        {CARRIERS.map((c) => <option key={c} value={c} />)}
      </datalist>
      <Input name="tracking" required placeholder="Tracking number" className="w-[170px]" aria-label="Tracking number" />
      <Button size="sm" type="submit" loading={pending}>Mark shipped</Button>
      {state.error && <span className="text-[12px] text-danger">{state.error}</span>}
    </form>
  );
}
