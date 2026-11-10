import { ImageResponse } from "next/og";

export const alt = "Seleto Store — tênis, roupas e acessórios";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff" }}>
        <div style={{ fontSize: 190, fontWeight: 900, letterSpacing: 24 }}>SELETO</div>
        <div style={{ fontSize: 44, marginTop: 16, color: "#ddd" }}>Tênis, roupas e acessórios das melhores marcas</div>
      </div>
    ),
    size,
  );
}
