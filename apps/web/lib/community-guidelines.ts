/**
 * The community guidelines — one list, used by the chat's house rules, the
 * discussions pages and the public /connect page, so they cannot disagree.
 */
export const HOUSE_RULES: readonly string[] = [
  "Be useful. Ask specific questions; give concrete answers.",
  "Wins need proof — a link, a number, a result.",
  "No selling, recruiting or spam. Staff remove it and may mute.",
  "Disagree with ideas, never with people.",
  "Report, don’t argue. Staff read every report.",
];

/** The full guidelines: the house rules plus how moderation and rewards work. */
export const COMMUNITY_GUIDELINES: readonly { title: string; body: string }[] = [
  { title: "Be useful", body: "Ask specific questions and give concrete answers. Say what you tried, what happened and what you need." },
  { title: "Wins need proof", body: "A link, a number, a result. A claim without proof is a story, and stories are not what this room is for." },
  { title: "No selling, recruiting or spam", body: "No pitches, affiliate links, signals, “DM me” offers or recruitment for anything else. Staff remove it and may mute." },
  { title: "Disagree with ideas, never with people", body: "Argue the point. No insults, no harassment, no piling on. Respect is the default reaction here." },
  { title: "Report, don’t argue", body: "If something breaks these rules, report it. Staff read every report, act on what breaks the rules and tell you when they have." },
  { title: "No financial or medical advice", body: "Share what you did and what happened to you. Do not tell someone else what to buy, sell, take or stop taking." },
  { title: "Keep it here", body: "There are no direct messages. Do not move members to other platforms to sell to them." },
  { title: "Talking earns nothing", body: "Posting, commenting and reacting never raise your rank or pay THC on their own. Progress comes from the work: lessons, the daily standard, challenges." },
];
