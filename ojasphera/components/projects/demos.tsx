import dynamic from "next/dynamic";
import type { Project } from "@/lib/projects";

function DemoLoading() {
  return (
    <div className="flex aspect-[16/9] items-center justify-center border border-line bg-void">
      <span className="eyebrow animate-pulse">Loading environment…</span>
    </div>
  );
}

/** Registry of interactive demos. Register new project demos here; each is code-split. */
const DEMOS: Record<NonNullable<Project["demo"]>, React.ComponentType> = {
  "marshal-tower": dynamic(() => import("./MarshalTowerDemo").then((m) => m.MarshalTowerDemo), { loading: DemoLoading }),
  "emerald-haven": dynamic(() => import("./EmeraldHavenDemo").then((m) => m.EmeraldHavenDemo), { loading: DemoLoading }),
};

export function ProjectDemo({ demo }: { demo: Project["demo"] }) {
  if (!demo) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center border border-dashed border-line-strong">
        <span className="eyebrow">Interactive demo to be published</span>
      </div>
    );
  }
  const Demo = DEMOS[demo];
  return <Demo />;
}
