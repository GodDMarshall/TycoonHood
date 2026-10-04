import { ImageResponse } from "next/og";
import { MARK } from "@/lib/brand";
import { getProject, projects } from "@/lib/projects";

export const alt = "Ojasphera Labs project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

/** A share card per project: name, category and the eclipse in the project's accent. */
export default async function ProjectOG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  const name = p?.name ?? "Ojasphera Labs";
  const accent = p?.accent ?? "#f2b45a";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050607", color: "#eceef1", padding: 72, position: "relative", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", right: -60, top: 40, width: 700, height: 700, display: "flex", background: `radial-gradient(circle at 70% 25%, ${accent}38, rgba(5,6,7,0) 60%)` }} />
        <svg width="420" height="420" viewBox="0 0 100 100" style={{ position: "absolute", right: 90, top: 105 }}>
          <path fill="#eceef1" fillOpacity="0.92" fillRule="evenodd" d={MARK.rim} />
          <circle cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill={accent} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 7, fontWeight: 600 }}>
            OJASPHERA <span style={{ color: "#8a909b", marginLeft: 18, fontWeight: 500 }}>LABS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: accent }}>{(p?.category ?? "").toUpperCase()}</div>
            <div style={{ display: "flex", fontSize: 82, lineHeight: 1, letterSpacing: -3, fontWeight: 600, marginTop: 18 }}>{name}</div>
          </div>
          <div style={{ display: "flex", fontSize: 19, color: "#a3a9b4", letterSpacing: 4 }}>A SYSTEM BY OJASPHERA LABS</div>
        </div>
      </div>
    ),
    size,
  );
}
