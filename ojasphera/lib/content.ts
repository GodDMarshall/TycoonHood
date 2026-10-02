/** Editorial content shared between the homepage and inner pages. */

export const offerings = [
  {
    key: "business",
    title: "Intelligent Business Systems",
    body: "Custom platforms that combine business data, workflows, automation and AI into one system shaped around how the business actually runs.",
  },
  {
    key: "agents",
    title: "AI Agent Systems",
    body: "Real-time AI agents that assist with research, operations, analysis, decision-making and execution — working together inside a controlled environment.",
  },
  {
    key: "environments",
    title: "Digital Project Environments",
    body: "Interactive environments that let people explore and understand complex physical or conceptual projects digitally.",
  },
  {
    key: "automation",
    title: "Automation",
    body: "Repetitive workflows turned into intelligent automated systems, with people kept in the loop where judgement matters.",
  },
  {
    key: "data",
    title: "Data & Intelligence",
    body: "Scattered information transformed into dashboards, intelligence layers and decision systems people can actually use.",
  },
  {
    key: "immersive",
    title: "Immersive Interfaces",
    body: "3D, spatial and interactive experiences that make complex systems easier to see, navigate and understand.",
  },
  {
    key: "custom",
    title: "Custom Technology",
    body: "When existing software isn't enough, we build the technology specifically for the problem.",
  },
] as const;

export type OfferingKey = (typeof offerings)[number]["key"];

export const method = [
  { n: "01", title: "Understand", body: "Understand the business, project, problem and desired outcome." },
  { n: "02", title: "Map", body: "Map the data, workflows, people, systems and dependencies." },
  { n: "03", title: "Architect", body: "Design the technical and intelligence architecture." },
  { n: "04", title: "Build", body: "Develop the software, AI agents, automation and interfaces." },
  { n: "05", title: "Connect", body: "Connect systems, data sources, workflows and intelligence." },
  { n: "06", title: "Deploy", body: "Turn the concept into a working environment." },
  { n: "07", title: "Evolve", body: "Continuously improve the system as the business changes." },
] as const;

export const builtFor = [
  { title: "Businesses", body: "Operations, intelligence, automation, internal systems." },
  { title: "Real Estate & Infrastructure", body: "Digital project environments, visualisation, management systems." },
  { title: "Startups", body: "MVPs, product systems, AI infrastructure and automation." },
  { title: "Enterprises", body: "Internal intelligence systems, workflow automation and custom platforms." },
  { title: "Research", body: "Research environments, data systems and intelligent analysis." },
  { title: "Founders & Innovators", body: "Turn ambitious ideas into working technology." },
] as const;

export const techGroups = [
  {
    key: "intelligence",
    name: "Intelligence",
    color: "#f2b45a",
    does: "Reads, reasons and decides.",
    items: ["AI", "LLMs", "AI Agents", "Reasoning Systems", "Knowledge Systems"],
  },
  {
    key: "systems",
    name: "Systems",
    color: "#7cc7e8",
    does: "Holds state, moves data, stays up.",
    items: ["Cloud", "APIs", "Databases", "Real-time Infrastructure", "Distributed Systems"],
  },
  {
    key: "automation",
    name: "Automation",
    color: "#b9c7ff",
    does: "Runs the work and watches it run.",
    items: ["Workflows", "Agent Orchestration", "Business Automation", "Monitoring", "Integrations"],
  },
  {
    key: "experience",
    name: "Experience",
    color: "#6fd3a8",
    does: "Makes it visible and usable.",
    items: ["Web", "3D", "Interactive Interfaces", "Data Visualisation", "Spatial Experiences"],
  },
] as const;
