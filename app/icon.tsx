import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType },
    { id: "512", size: { width: 512, height: 512 }, contentType },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const dimension = String(await id) === "512" ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#10b981",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Keep the larger icon's initials inside the maskable safe zone.
          fontSize: dimension === 512 ? 192 : 96,
          fontWeight: 700,
          color: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        MM
      </div>
    ),
    { width: dimension, height: dimension },
  );
}
