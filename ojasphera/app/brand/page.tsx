import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Mark } from "@/components/site/Logo";

export const metadata: Metadata = {
  title: "Brand",
  description: "The Ojasphera Labs logo, its meaning, colours and downloadable files.",
  alternates: { canonical: "/brand" },
};

const B = "/brand";
const downloads = [
  { name: "Full lockup", files: [["SVG · dark", `${B}/ojasphera-lockup-full-dark.svg`], ["SVG · light", `${B}/ojasphera-lockup-full-light.svg`], ["PNG · dark", `${B}/ojasphera-lockup-full-dark.png`], ["PNG · light", `${B}/ojasphera-lockup-full-light.png`]], preview: `${B}/ojasphera-lockup-full-dark.svg`, bg: "dark" },
  { name: "Horizontal lockup", files: [["SVG · dark", `${B}/ojasphera-lockup-horizontal-dark.svg`], ["SVG · light", `${B}/ojasphera-lockup-horizontal-light.svg`]], preview: `${B}/ojasphera-lockup-horizontal-light.svg`, bg: "light" },
  { name: "Stacked lockup", files: [["SVG · dark", `${B}/ojasphera-lockup-stacked-dark.svg`], ["SVG · light", `${B}/ojasphera-lockup-stacked-light.svg`]], preview: `${B}/ojasphera-lockup-stacked-dark.svg`, bg: "dark" },
  { name: "Mark", files: [["SVG · dark", `${B}/ojasphera-mark.svg`], ["SVG · light", `${B}/ojasphera-mark-on-light.svg`], ["SVG · white", `${B}/ojasphera-mark-mono-white.svg`], ["SVG · black", `${B}/ojasphera-mark-mono-black.svg`], ["PNG · 1024", `${B}/ojasphera-mark-1024.png`]], preview: `${B}/ojasphera-mark-on-light.svg`, bg: "light" },
  { name: "App icon", files: [["SVG", `${B}/ojasphera-app-icon.svg`], ["PNG · 512", `${B}/ojasphera-icon-512.png`], ["PNG · 192", `${B}/ojasphera-icon-192.png`]], preview: `${B}/ojasphera-app-icon.svg`, bg: "dark" },
  { name: "Wordmark", files: [["SVG · white", `${B}/ojasphera-wordmark-white.svg`], ["SVG · black", `${B}/ojasphera-wordmark-black.svg`]], preview: `${B}/ojasphera-wordmark-white.svg`, bg: "dark" },
] as const;

const colours = [
  ["Void", "#050607", "Background"],
  ["Ink", "#ECEEF1", "Rim, type"],
  ["Ojas amber", "#F2B45A", "The spark"],
  ["Signal", "#7CC7E8", "Data, flow"],
  ["Growth", "#6FD3A8", "Physical systems"],
] as const;

export default function BrandPage() {
  return (
    <>
      <PageHero eyebrow="Brand · Press kit" title="The eclipse." lede="The Ojasphera mark captures one instant: the moment light breaks past the edge of an eclipse. Here is what it means, and the files to use it." />

      <section className="border-t border-line py-24 md:py-32">
        <div className="shell grid items-center gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-6">
            <div className="brackets relative grid aspect-square place-items-center border border-line bg-black">
              <Mark size={300} className="text-ink" />
            </div>
          </Reveal>
          <div className="space-y-10 md:col-span-6">
            {[
              ["The core", "The dark disc is the real-world thing: the business, the project, the problem we start from."],
              ["The rim", "The light wrapped around it is what Ojasphera builds: the intelligence. It is heaviest where it meets the spark."],
              ["The spark", "Ojas is Sanskrit for radiance and vital energy. The spark is the moment a system comes alive — the eclipse's diamond ring."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 90} className="border-t border-line pt-5">
                <p className="mono text-xs uppercase tracking-[0.16em] text-ojas">{t}</p>
                <p className="mt-3 text-xl leading-snug text-ink-2">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line py-24 md:py-32">
        <div className="shell">
          <Reveal className="flex items-center gap-3 border-t border-line pt-4 md:w-1/4">
            <Mark size={13} className="text-ink-2" />
            <span className="eyebrow">Downloads</span>
          </Reveal>
          <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {downloads.map((d, i) => (
              <Reveal as="li" key={d.name} delay={(i % 3) * 70} className="border border-line">
                <div className={`grid aspect-[16/9] place-items-center p-10 ${d.bg === "dark" ? "bg-black" : "bg-[#f3f2ee]"}`}>
                  <Image src={d.preview} alt={`${d.name} preview`} width={320} height={96} unoptimized className="h-auto max-h-24 w-auto max-w-[80%]" />
                </div>
                <div className="border-t border-line p-5">
                  <p className="text-lg font-medium tracking-tight">{d.name}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {d.files.map(([label, href]) => (
                      <li key={href}>
                        <a href={href} download className="mono inline-block border border-line px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-ink-2 transition-colors hover:border-ojas/60 hover:text-ink">
                          {label} ↓
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line py-24 md:py-32">
        <div className="shell">
          <Reveal className="flex items-center gap-3 border-t border-line pt-4 md:w-1/4">
            <Mark size={13} className="text-ink-2" />
            <span className="eyebrow">Colour</span>
          </Reveal>
          <ul className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
            {colours.map(([name, hex, use]) => (
              <li key={hex} className="bg-base">
                <div className="h-28" style={{ background: hex }} />
                <div className="p-5">
                  <p className="font-medium">{name}</p>
                  <p className="mono mt-1 text-xs text-ink-2">{hex}</p>
                  <p className="mt-2 text-xs text-ink-3">{use}</p>
                </div>
              </li>
            ))}
          </ul>
          <Reveal className="mt-16 grid gap-6 text-sm text-ink-2 md:grid-cols-3">
            <p className="border-t border-line pt-4"><span className="text-ink">Clear space.</span> Keep the spark's diameter clear on every side of the mark.</p>
            <p className="border-t border-line pt-4"><span className="text-ink">Minimum size.</span> Mark 16 px; horizontal lockup 96 px wide.</p>
            <p className="border-t border-line pt-4"><span className="text-ink">Don't</span> rotate, stretch, outline or recolour the spark, or use the white mark on light backgrounds.</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
