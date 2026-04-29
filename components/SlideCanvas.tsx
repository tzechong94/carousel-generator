"use client";
import { forwardRef, type CSSProperties } from "react";
import type { Slide, AspectRatio } from "@/lib/types";
import { ASPECT_DIMS, focalToObjectPosition } from "@/lib/types";
import { PALETTES, fontClass, type PaletteSpec } from "@/lib/palettes";

type Props = {
  slide: Slide;
  paletteId: keyof typeof PALETTES;
  aspect: AspectRatio;
  pageNumber?: number;
  totalPages?: number;
  slideIndex?: number;
};

function fitSize(baseline: number, len: number, mid = 30, max = 100, floor = 0.55): number {
  if (len <= mid) return baseline;
  if (len >= max) return baseline * floor;
  const t = (len - mid) / (max - mid);
  return baseline * (1 - t * (1 - floor));
}

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  { slide, paletteId, aspect, pageNumber, totalPages, slideIndex },
  ref
) {
  const palette = PALETTES[paletteId];
  const dims = ASPECT_DIMS[aspect];

  const stageStyle: CSSProperties = {
    width: dims.w,
    height: dims.h,
    position: "relative",
    overflow: "hidden",
    color: palette.fg,
  };

  const bgFilter =
    paletteId === "gradient" && slideIndex !== undefined
      ? `hue-rotate(${slideIndex * 32}deg) saturate(1.05)`
      : undefined;

  return (
    <div ref={ref} style={stageStyle} className={fontClass(palette.body)}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.bg,
          filter: bgFilter,
        }}
      />

      {slide.type === "cover" && <CoverLayout slide={slide} palette={palette} dims={dims} />}
      {slide.type === "content" && (
        <ContentLayout slide={slide} palette={palette} dims={dims} />
      )}
      {slide.type === "cta" && <CtaLayout slide={slide} palette={palette} dims={dims} />}

      <PaletteDeco paletteId={paletteId} palette={palette} dims={dims} />

      {pageNumber !== undefined && totalPages !== undefined && (
        <PageBadge palette={palette} page={pageNumber} total={totalPages} />
      )}
    </div>
  );
});

function PaletteDeco({
  paletteId,
  palette,
  dims,
}: {
  paletteId: keyof typeof PALETTES;
  palette: PaletteSpec;
  dims: { w: number; h: number };
}) {
  if (paletteId === "noir") {
    // thin gold hairline frame
    return (
      <div
        style={{
          position: "absolute",
          inset: 26,
          border: `1px solid ${palette.accent}`,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />
    );
  }
  if (paletteId === "pastel") {
    // soft rounded inner stroke
    return (
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: `2px solid ${palette.accent}`,
          borderRadius: 28,
          opacity: 0.32,
          pointerEvents: "none",
        }}
      />
    );
  }
  if (paletteId === "swiss") {
    // top accent rule + tiny corner block
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            background: palette.accent,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 28,
            width: 14,
            height: 14,
            background: palette.accent,
          }}
        />
      </>
    );
  }
  // gradient palette: variation comes from per-slide hue-rotate on bg layer
  return null;
}

function PageBadge({ palette, page, total }: { palette: PaletteSpec; page: number; total: number }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        bottom: 40,
        fontSize: 26,
        letterSpacing: 2,
        color: palette.muted,
        fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
      }}
    >
      {String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </div>
  );
}

function CoverLayout({
  slide,
  palette,
  dims,
}: {
  slide: Slide & { type: "cover" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
}) {
  const padX = 80;
  const hasImage = !!slide.imageDataUrl;
  const titleSize = fitSize(dims.w * 0.085, slide.title.length, 28, 100, 0.55);
  return (
    <>
      {hasImage && (
        <>
          <img
            src={slide.imageDataUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: focalToObjectPosition(slide.imageFocal),
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: palette.scrim }} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: padX,
          display: "flex",
          flexDirection: "column",
          justifyContent: hasImage ? "flex-end" : "center",
        }}
      >
        {slide.eyebrow && (
          <div
            style={{
              color: palette.accent,
              fontSize: 28,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 32,
              fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
            }}
          >
            {slide.eyebrow}
          </div>
        )}
        <h1
          className={fontClass(palette.display)}
          style={{
            fontSize: titleSize,
            lineHeight: 1.05,
            letterSpacing: palette.display === "serif" ? -1 : -2,
            margin: 0,
            fontWeight: 700,
            color: palette.fg,
            maxWidth: dims.w - padX * 2,
          }}
        >
          {slide.title}
        </h1>
        {slide.subtitle && (
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              lineHeight: 1.4,
              color: palette.muted,
              maxWidth: dims.w * 0.8,
            }}
          >
            {slide.subtitle}
          </div>
        )}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            color: palette.fg,
            opacity: 0.85,
            fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
            letterSpacing: 2,
          }}
        >
          <span>SWIPE</span>
          <span style={{ height: 2, width: 80, background: palette.accent }} />
        </div>
      </div>
    </>
  );
}

function ContentLayout({
  slide,
  palette,
  dims,
}: {
  slide: Slide & { type: "content" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
}) {
  const hasImage = !!slide.imageDataUrl;
  const heroH = hasImage ? Math.round(dims.h * 0.46) : 0;
  const padX = 80;
  const padY = hasImage ? 72 : 96;
  const headingBaseline = hasImage ? dims.w * 0.062 : dims.w * 0.075;
  const headingSize = fitSize(headingBaseline, slide.heading.length, 30, 90, 0.6);
  const bodyMaxW = dims.w * 0.78;

  return (
    <>
      {hasImage && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: heroH,
            overflow: "hidden",
          }}
        >
          <img
            src={slide.imageDataUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: focalToObjectPosition(slide.imageFocal),
            }}
          />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: heroH,
          bottom: 0,
          padding: `${padY}px ${padX}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {slide.index !== undefined && (
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
            <span
              style={{
                color: palette.accent,
                fontSize: hasImage ? 72 : 96,
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: -3,
                fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
              }}
            >
              {String(slide.index).padStart(2, "0")}
            </span>
            <span
              style={{
                flex: 1,
                height: 2,
                background: palette.accent,
                opacity: 0.45,
              }}
            />
          </div>
        )}
        <h2
          className={fontClass(palette.display)}
          style={{
            fontSize: headingSize,
            lineHeight: 1.08,
            letterSpacing: palette.display === "serif" ? -0.5 : -1.5,
            margin: 0,
            fontWeight: 700,
            color: palette.fg,
            maxWidth: bodyMaxW,
          }}
        >
          {slide.heading}
        </h2>

        {(slide.body || (slide.bullets && slide.bullets.length > 0)) && (
          <div
            style={{
              marginTop: 28,
              height: 3,
              width: 56,
              background: palette.accent,
              opacity: 0.85,
            }}
          />
        )}

        {slide.body && (
          <p
            style={{
              marginTop: 28,
              marginBottom: 0,
              fontSize: 30,
              lineHeight: 1.5,
              color: palette.muted,
              fontWeight: 400,
              maxWidth: bodyMaxW,
            }}
          >
            {slide.body}
          </p>
        )}

        {slide.bullets && slide.bullets.length > 0 && (
          <ul
            style={{
              marginTop: slide.body ? 22 : 28,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {slide.bullets.map((b, i) => (
              <li
                key={i}
                style={{
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: palette.fg,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  maxWidth: bodyMaxW,
                }}
              >
                <span
                  style={{
                    color: palette.accent,
                    flexShrink: 0,
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: 1,
                    fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
                    minWidth: 36,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function CtaLayout({
  slide,
  palette,
  dims,
}: {
  slide: Slide & { type: "cta" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
}) {
  const avatarSize = Math.round(dims.w * 0.32);
  const titleSize = fitSize(dims.w * 0.075, slide.title.length, 26, 80, 0.6);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 40,
      }}
    >
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: "50%",
          overflow: "hidden",
          background: palette.accent,
          border: `6px solid ${palette.accent}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.bg.startsWith("linear") ? "#000" : palette.bg,
          fontSize: avatarSize * 0.4,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {slide.imageDataUrl ? (
          <img
            src={slide.imageDataUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: focalToObjectPosition(slide.imageFocal),
            }}
          />
        ) : (
          <span>★</span>
        )}
      </div>
      <h2
        className={fontClass(palette.display)}
        style={{
          fontSize: titleSize,
          lineHeight: 1.1,
          letterSpacing: palette.display === "serif" ? -0.5 : -1.5,
          margin: 0,
          fontWeight: 700,
          color: palette.fg,
          maxWidth: dims.w * 0.85,
        }}
      >
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p style={{ fontSize: 30, lineHeight: 1.4, color: palette.muted, margin: 0, maxWidth: dims.w * 0.7 }}>
          {slide.subtitle}
        </p>
      )}
      {slide.handle && (
        <div
          style={{
            marginTop: 16,
            padding: "20px 40px",
            border: `3px solid ${palette.accent}`,
            color: palette.accent,
            borderRadius: 999,
            fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {slide.handle}
        </div>
      )}
    </div>
  );
}
