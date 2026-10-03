import Link from "next/link";
import { Mark } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <section className="relative isolate flex min-h-[86svh] items-center overflow-hidden bg-black pt-[var(--nav-h)]">
      <Mark size={560} className="pointer-events-none absolute -right-24 top-1/2 -z-10 -translate-y-1/2 text-white/[0.06]" spark="rgb(242 180 90 / 0.22)" />
      <div className="shell relative">
        <p className="eyebrow">404 · Signal lost</p>
        <h1 className="display mt-6 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">This part of the system is in eclipse.</h1>
        <p className="lede mt-6 max-w-xl">The page you were looking for doesn't exist, or hasn't been built yet.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary" data-magnetic>
            Back to the light <span className="arrow">→</span>
          </Link>
          <Link href="/build" className="btn btn-ghost">
            Build it with us
          </Link>
        </div>
      </div>
    </section>
  );
}
