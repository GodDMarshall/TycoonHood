import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80svh] items-center pt-[var(--nav-h)]">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="shell relative">
        <p className="eyebrow">404 · Node not found</p>
        <h1 className="display mt-6 text-[clamp(2.5rem,7vw,6rem)]">This part of the system doesn't exist yet.</h1>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Back to the system <span className="arrow">→</span>
          </Link>
          <Link href="/build" className="btn btn-ghost">
            Build it with us
          </Link>
        </div>
      </div>
    </section>
  );
}
