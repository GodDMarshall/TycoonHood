import type { Metadata } from "next";
import { AgentsSection } from "@/components/sections/AgentsSection";
import { BuildCTA } from "@/components/sections/BuildCTA";
import { MethodSection } from "@/components/sections/MethodSection";
import { WhatWeBuild } from "@/components/sections/WhatWeBuild";
import { WhySection } from "@/components/sections/WhySection";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Systems",
  description:
    "Intelligent business systems, AI agent systems, automation, data intelligence, immersive interfaces and custom technology — built around the problem, using the Ojasphera method.",
  alternates: { canonical: "/systems" },
};

export default function SystemsPage() {
  return (
    <>
      <PageHero
        eyebrow="Systems"
        title="Don't just digitise the business. Build the intelligence around it."
        lede="Real world → data → intelligence → system → experience. This is what we build, how we build it, and what it looks like when it's running."
      />
      <WhatWeBuild index="01" />
      <MethodSection index="02" />
      <AgentsSection index="03" />
      <WhySection index="04" />
      <BuildCTA index="05" />
    </>
  );
}
