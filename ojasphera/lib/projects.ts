/**
 * The project library.
 *
 * Every system Ojasphera builds is described by one `Project` entry. Adding a
 * project = appending an object here (and, optionally, registering an
 * interactive demo in components/projects/demos.tsx). Index pages, the
 * homepage, the sitemap and case-study routes all read from this list.
 *
 * Content rule: only state what is known. Anything not yet documented belongs
 * in `pending` so the page says so honestly instead of inventing it.
 */

export type ArchitectureLayer = {
  name: string;
  items: string[];
};

export type Project = {
  slug: string;
  index: string;
  name: string;
  category: string;
  /** One line used on cards and in metadata. */
  summary: string;
  /** Accent hue used by this project's visuals. */
  accent: string;
  status: "live-demo" | "in-development" | "concept";
  /** Key of an interactive demo registered in components/projects/demos.tsx. */
  demo?: "marshal-tower" | "emerald-haven";
  /** What the visitor should see the system doing on the card. */
  signals: string[];
  problem: { title: string; body: string[] };
  idea: { title: string; body: string[] };
  system: { title: string; body: string; layers: ArchitectureLayer[] };
  experience: { title: string; body: string };
  intelligence: { title: string; body: string; capabilities: { name: string; detail: string }[] };
  result: { title: string; body: string; enables: string[] };
  technology: string[];
  /** Facts not yet published (screenshots, metrics, timelines). Rendered as "to be documented". */
  pending?: string[];
};

export const projects: Project[] = [
  {
    slug: "marshal-tower",
    index: "01",
    name: "Marshal Tower",
    category: "AI Workspace / Autonomous Systems",
    summary:
      "An AI-powered workspace designed around real-time working agents — AI that operates inside an organised digital environment, not a chat box.",
    accent: "#f2b45a",
    status: "live-demo",
    demo: "marshal-tower",
    signals: ["AI agents", "Real-time activity", "Task routing", "Agent communication", "Live system state"],
    problem: {
      title: "AI was stuck in a text box.",
      body: [
        "Most AI tools are a single conversation: one prompt in, one answer out. Real work doesn't look like that. It has tasks, owners, dependencies, hand-offs and a state that keeps changing while you're not looking.",
        "A chatbot can't hold that state, can't coordinate with other workers, and can't show you what it's doing. So people end up copying context between windows and acting as the glue themselves.",
      ],
    },
    idea: {
      title: "Give agents a building to work in.",
      body: [
        "Marshal Tower treats AI agents as workers inside a structured workspace. Each agent has a role, a queue, tools and a visible status. Work moves between them the way it moves between people on a well-run team.",
        "The workspace — not the conversation — is the product. You see every agent, every task and every hand-off in real time, and you can step in at any point.",
      ],
    },
    system: {
      title: "A workspace architecture for autonomous work.",
      body: "The system is organised as layers: a workspace model that holds tasks and state, an orchestration layer that routes work between specialised agents, and an interface that renders the whole operation live.",
      layers: [
        { name: "Interface", items: ["Live workspace view", "Agent status panels", "Task boards", "Activity stream"] },
        { name: "Orchestration", items: ["Task routing", "Agent-to-agent messaging", "Hand-off protocol", "Human checkpoints"] },
        { name: "Agents", items: ["Role-specialised agents", "Tool access per role", "Working memory", "Status reporting"] },
        { name: "Workspace state", items: ["Tasks & dependencies", "Shared context", "Event log", "Real-time sync"] },
      ],
    },
    experience: {
      title: "Step inside the workspace.",
      body: "Below is an interactive model of how Marshal Tower operates: dispatch a task and watch agents claim it, communicate, hand work across and update the shared state in real time.",
    },
    intelligence: {
      title: "Agents that coordinate, not just respond.",
      body: "The intelligence in Marshal Tower is distributed. No single model does everything — specialised agents reason about their part and the workspace coordinates the whole.",
      capabilities: [
        { name: "Delegation", detail: "Incoming work is decomposed and routed to the agent whose role fits it." },
        { name: "Communication", detail: "Agents message each other directly, passing context instead of losing it." },
        { name: "Visibility", detail: "Every action is reflected in the shared state, so the operation is always observable." },
        { name: "Control", detail: "People can inspect, pause or redirect any agent without breaking the system." },
      ],
    },
    result: {
      title: "AI that works where the work is.",
      body: "Marshal Tower demonstrates a pattern Ojasphera can build for any organisation: AI agents embedded in a structured environment that reflects how that organisation actually operates.",
      enables: [
        "Multiple AI agents working in parallel on one operation",
        "A live, inspectable picture of what every agent is doing",
        "Work that persists and progresses beyond a single conversation",
        "Human oversight built into the system, not bolted on",
      ],
    },
    technology: ["LLMs", "Agent orchestration", "Real-time infrastructure", "Event-driven state", "Interactive interfaces"],
    pending: ["Product screenshots", "Deployment details", "Usage outcomes"],
  },
  {
    slug: "emerald-haven",
    index: "02",
    name: "Emerald Haven Estates",
    category: "Immersive Digital Project Environment",
    summary:
      "A physical estate transformed into an interactive digital environment — turning a complex real-world project into something anyone can explore and understand.",
    accent: "#6fd3a8",
    status: "live-demo",
    demo: "emerald-haven",
    signals: ["Spatial layout", "Land & plantation data", "Infrastructure", "Equipment", "Interactive map"],
    problem: {
      title: "A physical project is hard to see.",
      body: [
        "An estate is land, plantation, roads, water, buildings and equipment — spread across space and changing over time. The information about it usually lives in documents, spreadsheets, photos and people's heads.",
        "A brochure or a listing page flattens all of that. Anyone trying to understand the project — a buyer, a partner, a manager — has to reassemble it mentally.",
      ],
    },
    idea: {
      title: "Make the place itself the interface.",
      body: [
        "Instead of a real-estate website, Emerald Haven is a digital environment of the estate. The layout is the navigation: you explore the land, and the information attaches to where it physically belongs.",
        "Plantation zones, infrastructure, equipment and project information become layers on one spatial model that can grow as the estate does.",
      ],
    },
    system: {
      title: "A spatial model with information layers.",
      body: "The system maps the estate into zones and assets, attaches structured project data to each, and renders it as an explorable environment with layers that can be switched on and off.",
      layers: [
        { name: "Experience", items: ["Interactive estate map", "Layer controls", "Zone detail views", "Guided exploration"] },
        { name: "Information layers", items: ["Plantation & land", "Infrastructure", "Equipment", "Project information"] },
        { name: "Spatial model", items: ["Zones & boundaries", "Assets & positions", "Paths & access", "Relationships"] },
        { name: "Data", items: ["Structured project records", "Media", "Status", "Updatable content"] },
      ],
    },
    experience: {
      title: "Explore the estate.",
      body: "Below is an interactive model of the Emerald Haven environment. Toggle layers, select zones and see how project information attaches to physical space. The layout is illustrative.",
    },
    intelligence: {
      title: "Information that knows where it belongs.",
      body: "The intelligence layer is spatial: every record is tied to a place, so the environment can answer questions about the estate by location, layer and relationship.",
      capabilities: [
        { name: "Spatial context", detail: "Data is organised by where it is, not which file it's in." },
        { name: "Layered views", detail: "The same estate can be read as land, infrastructure, equipment or project status." },
        { name: "Extensibility", detail: "New zones, assets and data sources slot into the model as the project grows." },
        { name: "Operational path", detail: "The same model can later carry monitoring, maintenance and AI-assisted analysis." },
      ],
    },
    result: {
      title: "A complex place, made understandable.",
      body: "Emerald Haven demonstrates how Ojasphera turns a physical project into an intelligent digital experience — a pattern that applies to any development, facility, campus or infrastructure project.",
      enables: [
        "Exploring a physical project without being on site",
        "One place where land, infrastructure and equipment information connects",
        "A foundation for management, monitoring and analysis systems",
        "Communicating a complex project clearly to anyone",
      ],
    },
    technology: ["Spatial interfaces", "Interactive maps", "Structured data models", "Web", "Data visualisation"],
    pending: ["Estate photography & surveys", "Precise land data", "Project timeline"],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
