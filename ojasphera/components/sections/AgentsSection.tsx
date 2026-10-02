import { AgentEnvironment } from "../agents/AgentEnvironment";
import { SectionHead } from "../ui/Section";
import { Reveal } from "../ui/Reveal";

export function AgentsSection({ index = "05" }: { index?: string }) {
  return (
    <section id="agents" aria-labelledby="agents-title" className="relative border-t border-line py-28 md:py-40">
      <div className="shell">
        <SectionHead
          index={index}
          label="AI agents"
          title={<span id="agents-title">AI That Doesn't Just Answer.</span>}
          lede={
            <>
              <span className="text-ink">Systems that can observe, reason, coordinate and act.</span> Ojasphera builds
              agent-based systems where specialised agents work together inside a controlled environment — each with a
              role, tools and limits, passing work between them, with people approving what matters.
            </>
          }
        />
        <Reveal delay={120} className="mt-16">
          <AgentEnvironment />
        </Reveal>
        <div className="mt-10 grid gap-8 text-sm text-ink-2 md:grid-cols-3">
          {[
            ["Specialised", "Each agent does one kind of work well, instead of one model doing everything badly."],
            ["Coordinated", "Agents hand context to each other through a shared environment, so nothing is lost between steps."],
            ["Controlled", "Checkpoints, permissions and an event log keep people in charge of what the system does."],
          ].map(([t, b], i) => (
            <Reveal key={t} delay={i * 80} className="border-t border-line pt-4">
              <p className="text-ink">{t}</p>
              <p className="mt-2">{b}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
