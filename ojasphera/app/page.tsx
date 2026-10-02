import { Hero } from "@/components/hero/Hero";
import { AboutSection } from "@/components/sections/AboutSection";
import { AgentsSection } from "@/components/sections/AgentsSection";
import { Marquee } from "@/components/fx/Marquee";
import { BuildCTA } from "@/components/sections/BuildCTA";
import { ProofSection } from "@/components/sections/ProofSection";
import { BuiltForSection } from "@/components/sections/BuiltForSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { MethodSection } from "@/components/sections/MethodSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { WhatWeBuild } from "@/components/sections/WhatWeBuild";
import { WhySection } from "@/components/sections/WhySection";

/**
 * The homepage is a story:
 * Hero → Problem → What we build → How we build → Agents → Projects →
 * Capabilities (+ who it's for) → Why → About → Build with us.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <ProblemSection />
      <WhatWeBuild index="03" />
      <MethodSection index="04" />
      <AgentsSection index="05" />
      <ProjectsSection index="06" />
      <CapabilitiesSection index="07" />
      <BuiltForSection />
      <WhySection index="08" />
      <AboutSection index="09" />
      <ProofSection />
      <BuildCTA index="10" />
    </>
  );
}
