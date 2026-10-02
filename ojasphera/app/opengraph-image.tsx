import { ImageResponse } from "next/og";

export const alt = "Ojasphera Labs — Intelligent Digital Systems for Real-World Problems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const nodes: [number, number, string][] = [
  [720, 200, "#6fd3a8"], [740, 430, "#6fd3a8"], [860, 315, "#7cc7e8"], [980, 220, "#f2b45a"],
  [970, 410, "#f2b45a"], [1080, 230, "#b9c7ff"], [1075, 405, "#b9c7ff"], [1150, 315, "#eceef1"],
];

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050607", color: "#eceef1", padding: 72, position: "relative", fontFamily: "sans-serif" }}>
        {nodes.map(([x, y, c], i) => (
          <div key={i} style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 18, border: `2px solid ${c}`, display: "flex" }} />
        ))}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 8 }}>OJASPHERA LABS</div>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 1.02, letterSpacing: -2, fontWeight: 600 }}>
            We Build Intelligence Around Real-World Problems.
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#a3a9b4", letterSpacing: 4 }}>AI • SYSTEMS • AUTOMATION • EXPERIENCE</div>
        </div>
      </div>
    ),
    size,
  );
}
