import Link from "next/link";
import { minerLogoutAction } from "../app/actions";
import { Button } from "@tycoonhood/ui";

export function MinerHeader({ name, right }: { name: string; right?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <Link href="/" className="eyebrow hover:text-gold-bright">Tycoonhood Miner</Link>
        <p className="text-[13px] text-ink-2">{name}</p>
      </div>
      {right ?? (
        <form action={minerLogoutAction}>
          <Button variant="ghost" size="sm" type="submit">Sign out</Button>
        </form>
      )}
    </header>
  );
}
