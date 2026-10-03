import { ImageResponse } from "next/og";
import { MARK } from "@/lib/brand";

export const alt = "Ojasphera Labs — Intelligent Digital Systems for Real-World Problems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050607", color: "#eceef1", padding: 72, position: "relative", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", right: -40, top: 60, width: 640, height: 640, display: "flex", background: "radial-gradient(circle at 70% 25%, rgba(242,180,90,0.22), rgba(5,6,7,0) 60%)" }} />
        <svg width="460" height="460" viewBox="0 0 100 100" style={{ position: "absolute", right: 70, top: 85 }}>
          <path fill="#eceef1" fillRule="evenodd" d={MARK.rim} />
          <circle cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill="#f2b45a" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 7, fontWeight: 600 }}>
            OJASPHERA <span style={{ color: "#8a909b", marginLeft: 18, fontWeight: 500 }}>LABS</span>
          </div>
          <div style={{ display: "flex", fontSize: 62, lineHeight: 1.02, letterSpacing: -2, fontWeight: 600 }}>
            We Build Intelligence Around Real-World Problems.
          </div>
          <div style={{ display: "flex", fontSize: 19, color: "#a3a9b4", letterSpacing: 4 }}>AI • SYSTEMS • AUTOMATION • EXPERIENCE</div>
        </div>
      </div>
    ),
    size,
  );
}
