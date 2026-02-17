import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Wallet Joy - Manage Your Finances Together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(query: string): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${query}&display=swap`,
    {
      // Use older UA to get WOFF format (Satori doesn't support WOFF2)
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
      },
    },
  ).then((res) => res.text());
  const url = css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error("Failed to load font");
  return fetch(url).then((res) => res.arrayBuffer());
}

export default async function OGImage() {
  const [displayFont, bodyFont] = await Promise.all([
    loadFont("Fraunces:opsz,wght@9..144,700"),
    loadFont("Plus+Jakarta+Sans:wght@500"),
  ]);

  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoSrc = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #fefcf9 0%, #fff5f7 50%, #f5f0e8 100%)",
          fontFamily: '"Plus Jakarta Sans"',
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255, 143, 171, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            left: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(124, 180, 130, 0.12)",
          }}
        />

        <img
          src={logoSrc}
          width={140}
          height={140}
          style={{ marginBottom: 24 }}
        />

        <div
          style={{
            fontFamily: '"Fraunces"',
            fontSize: 64,
            fontWeight: 700,
            color: "#3d3530",
            lineHeight: 1.1,
          }}
        >
          Wallet Joy
        </div>

        <div
          style={{
            fontSize: 28,
            color: "#8b7355",
            fontWeight: 500,
            marginTop: 12,
          }}
        >
          Manage Your Finances Together
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 40 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#ff8fab",
            }}
          />
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#7cb482",
            }}
          />
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#ff8fab",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: displayFont, weight: 700, style: "normal" },
        {
          name: "Plus Jakarta Sans",
          data: bodyFont,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
