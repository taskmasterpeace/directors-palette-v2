import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "Director's Palette — AI Creative Studio"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const bebasNeue = await readFile(
    join(process.cwd(), "src/app/fonts/BebasNeue-Regular.ttf")
  )

  const features = [
    { label: "Storyboard", icon: "🎬" },
    { label: "Music Lab", icon: "🎵" },
    { label: "Storybook", icon: "📖" },
    { label: "Shot Creator", icon: "✨" },
    { label: "Shot Animator", icon: "▶" },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Film strip top border */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "4px",
            background:
              "linear-gradient(90deg, transparent, #f59e0b, transparent)",
            display: "flex",
          }}
        />

        {/* Film strip bottom border */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background:
              "linear-gradient(90deg, transparent, #f59e0b, transparent)",
            display: "flex",
          }}
        />

        {/* Sprocket holes - top */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
            gap: "48px",
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "8px",
                borderRadius: "2px",
                background: "rgba(245,158,11,0.15)",
                display: "flex",
              }}
            />
          ))}
        </div>

        {/* Sprocket holes - bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
            gap: "48px",
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "8px",
                borderRadius: "2px",
                background: "rgba(245,158,11,0.15)",
                display: "flex",
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "0 60px",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: "96px",
              color: "#fff",
              letterSpacing: "0.06em",
              lineHeight: 1,
              textAlign: "center",
              display: "flex",
            }}
          >
            {"DIRECTOR'S PALETTE"}
          </div>

          {/* Divider */}
          <div
            style={{
              width: "120px",
              height: "3px",
              background:
                "linear-gradient(90deg, transparent, #f59e0b, transparent)",
              display: "flex",
              margin: "4px 0",
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: "36px",
              color: "#f59e0b",
              letterSpacing: "0.25em",
              display: "flex",
            }}
          >
            AI CREATIVE STUDIO
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: "20px",
              color: "rgb(163,163,163)",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              marginTop: "8px",
              display: "flex",
            }}
          >
            {
              "Images, video, music, storyboards, and children's books — all from one studio."
            }
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "24px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {features.map((f) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <span style={{ fontSize: "18px", display: "flex" }}>
                  {f.icon}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    color: "rgba(245,158,11,0.9)",
                    display: "flex",
                  }}
                >
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "rgb(115,115,115)",
              letterSpacing: "0.15em",
              display: "flex",
            }}
          >
            directorspalette.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bebas Neue",
          data: bebasNeue,
          style: "normal" as const,
          weight: 400 as const,
        },
      ],
    }
  )
}
