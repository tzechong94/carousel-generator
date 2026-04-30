"use client";
import { forwardRef, type CSSProperties } from "react";
import type { ImageLayout, Slide, AspectRatio, TextTone } from "@/lib/types";
import { ASPECT_DIMS, effectiveImageLayout, focalToObjectPosition } from "@/lib/types";
import { PALETTES, fontClass, getPaletteFrame, radiusForCorners, type PaletteFrame, type PaletteSpec } from "@/lib/palettes";

function applyToneOverride(palette: PaletteSpec, tone: TextTone | undefined): PaletteSpec {
  if (!tone || tone === "auto") return palette;
  if (tone === "light") {
    return { ...palette, fg: "#ffffff", muted: "rgba(255,255,255,0.78)" };
  }
  return { ...palette, fg: "#0b0b0c", muted: "rgba(11,11,12,0.7)" };
}

type Props = {
  slide: Slide;
  paletteId: keyof typeof PALETTES;
  aspect: AspectRatio;
  slideIndex?: number;
};

function fitSize(baseline: number, len: number, mid = 30, max = 100, floor = 0.55): number {
  if (len <= mid) return baseline;
  if (len >= max) return baseline * floor;
  const t = (len - mid) / (max - mid);
  return baseline * (1 - t * (1 - floor));
}

type Geo = {
  // text region positioning
  textBox: CSSProperties;
  textAlign: "left" | "center";
  alignItems: "flex-start" | "center";
  // size scale relative to dims.w-based original
  scale: number;
  // effective region width (px) used as max-width caps for text
  textWidth: number;
};

function computeGeo(layout: ImageLayout | "none", dims: { w: number; h: number }): Geo {
  const padXFull = 96;
  const padXSide = 72;
  if (layout === "full") {
    return {
      textBox: {
        position: "absolute",
        inset: 0,
        padding: padXFull,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      },
      textAlign: "left",
      alignItems: "flex-start",
      scale: 1,
      textWidth: dims.w - padXFull * 2,
    };
  }
  if (layout === "top") {
    const heroH = Math.round(dims.h * 0.46);
    return {
      textBox: {
        position: "absolute",
        left: 0,
        right: 0,
        top: heroH,
        bottom: 0,
        padding: `80px ${padXFull}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
      textAlign: "left",
      alignItems: "flex-start",
      scale: 0.92,
      textWidth: dims.w - padXFull * 2,
    };
  }
  if (layout === "bottom") {
    const heroH = Math.round(dims.h * 0.46);
    return {
      textBox: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: heroH,
        padding: `80px ${padXFull}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
      textAlign: "left",
      alignItems: "flex-start",
      scale: 0.92,
      textWidth: dims.w - padXFull * 2,
    };
  }
  if (layout === "left") {
    const halfW = Math.round(dims.w * 0.5);
    return {
      textBox: {
        position: "absolute",
        left: halfW,
        top: 0,
        right: 0,
        bottom: 0,
        padding: padXSide,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
      textAlign: "left",
      alignItems: "flex-start",
      scale: 0.7,
      textWidth: dims.w - halfW - padXSide * 2,
    };
  }
  if (layout === "right") {
    const halfW = Math.round(dims.w * 0.5);
    return {
      textBox: {
        position: "absolute",
        left: 0,
        top: 0,
        right: halfW,
        bottom: 0,
        padding: padXSide,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
      textAlign: "left",
      alignItems: "flex-start",
      scale: 0.7,
      textWidth: dims.w - halfW - padXSide * 2,
    };
  }
  if (layout === "circle") {
    const avatarSize = Math.round(dims.w * 0.32);
    const avatarTopGap = Math.round(dims.h * 0.16);
    const textTop = avatarTopGap + avatarSize + 48;
    return {
      textBox: {
        position: "absolute",
        left: 0,
        right: 0,
        top: textTop,
        bottom: 0,
        padding: `0 ${padXFull}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
      },
      textAlign: "center",
      alignItems: "center",
      scale: 0.85,
      textWidth: Math.round(dims.w * 0.78),
    };
  }
  // no image — text-only, centered comfortably
  return {
    textBox: {
      position: "absolute",
      inset: 0,
      padding: padXFull,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    textAlign: "left",
    alignItems: "flex-start",
    scale: 1.05,
    textWidth: dims.w - padXFull * 2,
  };
}

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(function SlideCanvas(
  { slide, paletteId, aspect, slideIndex },
  ref
) {
  const basePalette = PALETTES[paletteId];
  const palette = applyToneOverride(basePalette, slide.textTone);
  const dims = ASPECT_DIMS[aspect];
  const hasImage = !!slide.imageDataUrl;
  const layout: ImageLayout | "none" = hasImage ? effectiveImageLayout(slide) : "none";
  const geo = computeGeo(layout, dims);
  const frame = getPaletteFrame(paletteId);

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
      {/* bg layer (gradient hue rotation lives here for gradient palette) */}
      <div style={{ position: "absolute", inset: 0, background: basePalette.bg, filter: bgFilter }} />

      {/* image layer — positioned per layout, inset to stay within the palette frame */}
      {hasImage && (
        <ImageLayer
          slide={slide}
          layout={layout as ImageLayout}
          dims={dims}
          palette={basePalette}
          frame={frame}
        />
      )}

      {/* scrim only for full-bleed — spans the whole slide to match the image */}
      {hasImage && layout === "full" && slide.textTone !== "dark" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: basePalette.scrim,
            pointerEvents: "none",
          }}
        />
      )}

      {/* text content — positioned per layout, offset by user drag */}
      <div
        style={{
          ...geo.textBox,
          transform: slide.textOffset
            ? `translate(${slide.textOffset.dx}px, ${slide.textOffset.dy}px)`
            : undefined,
        }}
      >
        <SlideContent
          slide={slide}
          palette={palette}
          dims={dims}
          textAlign={geo.textAlign}
          alignItems={geo.alignItems}
          scale={geo.scale}
          textWidth={geo.textWidth}
          isFullBleed={layout === "full"}
        />
      </div>

      <PaletteDeco paletteId={paletteId} palette={basePalette} dims={dims} />
    </div>
  );
});

function ImageLayer({
  slide,
  layout,
  dims,
  palette,
  frame,
}: {
  slide: Slide;
  layout: ImageLayout;
  dims: { w: number; h: number };
  palette: PaletteSpec;
  frame: PaletteFrame;
}) {
  const objectPosition = focalToObjectPosition(slide.imageFocal);
  const imgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition,
  };
  const inset = frame.inset;
  // Visible gap between the palette frame and partial-layout images so they
  // float inside the frame instead of sitting flush against the line.
  // Only applies when the palette actually has a frame (inset > 0).
  const gap = inset > 0 ? 14 : 0;
  const innerRadius = frame.radius && gap > 0 ? Math.max(8, frame.radius - gap) : frame.radius;
  const overlay = slide.imageOverlay ?? 0;
  const overlayEl =
    overlay > 0 ? (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.overlayTint,
          opacity: overlay,
          pointerEvents: "none",
        }}
      />
    ) : null;

  if (layout === "full") {
    // Full layout truly bleeds to the slide edge — palette frame sits on top of the image.
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  if (layout === "top") {
    const h = Math.round(dims.h * 0.46) - inset - gap;
    return (
      <div
        style={{
          position: "absolute",
          top: inset + gap,
          left: inset + gap,
          right: inset + gap,
          height: h,
          overflow: "hidden",
          borderRadius: gap > 0 ? innerRadius : radiusForCorners(frame.radius, "top"),
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  if (layout === "bottom") {
    const h = Math.round(dims.h * 0.46) - inset - gap;
    return (
      <div
        style={{
          position: "absolute",
          bottom: inset + gap,
          left: inset + gap,
          right: inset + gap,
          height: h,
          overflow: "hidden",
          borderRadius: gap > 0 ? innerRadius : radiusForCorners(frame.radius, "bottom"),
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  if (layout === "left") {
    const w = Math.round(dims.w * 0.5) - inset - gap;
    return (
      <div
        style={{
          position: "absolute",
          left: inset + gap,
          top: inset + gap,
          bottom: inset + gap,
          width: w,
          overflow: "hidden",
          borderRadius: gap > 0 ? innerRadius : radiusForCorners(frame.radius, "left"),
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  if (layout === "right") {
    const w = Math.round(dims.w * 0.5) - inset - gap;
    return (
      <div
        style={{
          position: "absolute",
          right: inset + gap,
          top: inset + gap,
          bottom: inset + gap,
          width: w,
          overflow: "hidden",
          borderRadius: gap > 0 ? innerRadius : radiusForCorners(frame.radius, "right"),
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  if (layout === "circle") {
    // circle is centered and small — naturally stays inside the frame, no inset needed
    const size = Math.round(dims.w * 0.32);
    const top = Math.round(dims.h * 0.16);
    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top,
          width: size,
          height: size,
          marginLeft: -size / 2,
          borderRadius: "50%",
          overflow: "hidden",
          background: palette.accent,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <img src={slide.imageDataUrl} alt="" style={imgStyle} />
        {overlayEl}
      </div>
    );
  }
  return null;
}

function SlideContent({
  slide,
  palette,
  dims,
  textAlign,
  alignItems,
  scale,
  textWidth,
  isFullBleed,
}: {
  slide: Slide;
  palette: PaletteSpec;
  dims: { w: number; h: number };
  textAlign: "left" | "center";
  alignItems: "flex-start" | "center";
  scale: number;
  textWidth: number;
  isFullBleed: boolean;
}) {
  const wrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems,
    textAlign,
    width: "100%",
    maxWidth: textWidth,
  };
  if (slide.type === "cover") {
    return (
      <div style={wrap}>
        <CoverContent slide={slide} palette={palette} dims={dims} scale={scale} textAlign={textAlign} />
      </div>
    );
  }
  if (slide.type === "content") {
    return (
      <div style={wrap}>
        <ContentContent slide={slide} palette={palette} dims={dims} scale={scale} textAlign={textAlign} textWidth={textWidth} />
      </div>
    );
  }
  if (slide.type === "cta") {
    return (
      <div style={wrap}>
        <CtaContent slide={slide} palette={palette} dims={dims} scale={scale} textAlign={textAlign} hideAvatarPlaceholder={isFullBleed} />
      </div>
    );
  }
  return null;
}

function CoverContent({
  slide,
  palette,
  dims,
  scale,
  textAlign,
}: {
  slide: Slide & { type: "cover" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
  scale: number;
  textAlign: "left" | "center";
}) {
  const titleSize = fitSize(dims.w * 0.085 * scale, slide.title.length, 28, 100, 0.55);
  return (
    <>
      {slide.eyebrow && (
        <div
          style={{
            color: palette.accent,
            fontSize: 26 * scale,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 28,
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
        }}
      >
        {slide.title}
      </h1>
      {slide.subtitle && (
        <div
          style={{
            marginTop: 28,
            fontSize: 28 * scale,
            lineHeight: 1.4,
            color: palette.muted,
            maxWidth: "100%",
          }}
        >
          {slide.subtitle}
        </div>
      )}
      <div
        style={{
          marginTop: 44,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 22 * scale,
          color: palette.fg,
          opacity: 0.85,
          fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
          letterSpacing: 2,
          justifyContent: textAlign === "center" ? "center" : "flex-start",
        }}
      >
        <span>SWIPE</span>
        <span style={{ height: 2, width: 64, background: palette.accent }} />
      </div>
    </>
  );
}

function ContentContent({
  slide,
  palette,
  dims,
  scale,
  textAlign,
  textWidth,
}: {
  slide: Slide & { type: "content" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
  scale: number;
  textAlign: "left" | "center";
  textWidth: number;
}) {
  const headingSize = fitSize(dims.w * 0.062 * scale, slide.heading.length, 30, 90, 0.6);
  const isCenter = textAlign === "center";
  return (
    <>
      {slide.index !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 24,
            width: "100%",
            justifyContent: isCenter ? "center" : "flex-start",
          }}
        >
          <span
            style={{
              color: palette.accent,
              fontSize: 64 * scale,
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: -3,
              fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
            }}
          >
            {String(slide.index).padStart(2, "0")}
          </span>
          {!isCenter && (
            <span
              style={{
                flex: 1,
                height: 2,
                background: palette.accent,
                opacity: 0.4,
              }}
            />
          )}
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
        }}
      >
        {slide.heading}
      </h2>

      {(slide.body || (slide.bullets && slide.bullets.length > 0)) && (
        <div
          style={{
            marginTop: 24,
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
            marginTop: 22,
            marginBottom: 0,
            fontSize: 28 * scale,
            lineHeight: 1.5,
            color: palette.muted,
            fontWeight: 400,
            maxWidth: textWidth,
          }}
        >
          {slide.body}
        </p>
      )}

      {slide.bullets && slide.bullets.length > 0 && (
        <ul
          style={{
            marginTop: slide.body ? 18 : 24,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "100%",
            textAlign: "left",
          }}
        >
          {slide.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                fontSize: 26 * scale,
                lineHeight: 1.4,
                color: palette.fg,
                display: "flex",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              <span
                style={{
                  color: palette.accent,
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: 20 * scale,
                  letterSpacing: 1,
                  fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
                  minWidth: 32,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CtaContent({
  slide,
  palette,
  dims,
  scale,
  textAlign,
  hideAvatarPlaceholder,
}: {
  slide: Slide & { type: "cta" };
  palette: PaletteSpec;
  dims: { w: number; h: number };
  scale: number;
  textAlign: "left" | "center";
  hideAvatarPlaceholder: boolean;
}) {
  const titleSize = fitSize(dims.w * 0.075 * scale, slide.title.length, 26, 80, 0.6);
  return (
    <>
      <h2
        className={fontClass(palette.display)}
        style={{
          fontSize: titleSize,
          lineHeight: 1.1,
          letterSpacing: palette.display === "serif" ? -0.5 : -1.5,
          margin: 0,
          fontWeight: 700,
          color: palette.fg,
        }}
      >
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p
          style={{
            marginTop: 24,
            fontSize: 28 * scale,
            lineHeight: 1.4,
            color: palette.muted,
            margin: 0,
            marginBlockStart: 24,
          }}
        >
          {slide.subtitle}
        </p>
      )}
      {slide.handle && (() => {
        const defaultAlign: "left" | "center" = textAlign === "center" ? "center" : "left";
        const align = slide.handleAlign ?? defaultAlign;
        const alignSelf = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
        return (
          <div
            data-drag-handle="cta"
            style={{
              marginTop: 32,
              padding: `${18 * scale}px ${36 * scale}px`,
              border: `3px solid ${palette.accent}`,
              color: palette.accent,
              borderRadius: 999,
              fontFamily: "ui-monospace, JetBrains Mono, Menlo, monospace",
              fontSize: 28 * scale,
              fontWeight: 700,
              letterSpacing: 1,
              alignSelf,
              transform: slide.handleOffset
                ? `translate(${slide.handleOffset.dx}px, ${slide.handleOffset.dy}px)`
                : undefined,
              pointerEvents: "auto",
              cursor: "grab",
            }}
          >
            {slide.handle}
          </div>
        );
      })()}
      {/* hideAvatarPlaceholder is currently a no-op — kept for future use when we want to suppress the star placeholder behind a full-bleed image */}
      {hideAvatarPlaceholder ? null : null}
    </>
  );
}

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
  if (paletteId === "sage") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: `1px solid ${palette.accent}`,
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 32,
            border: `1px solid ${palette.accent}`,
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />
      </>
    );
  }
  if (paletteId === "mocha") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 30,
            border: `1px solid ${palette.accent}`,
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 44,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: palette.accent,
            opacity: 0.85,
          }}
        />
      </>
    );
  }
  if (paletteId === "dopamine") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: palette.accent,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            width: 80,
            height: 8,
            background: palette.accent,
          }}
        />
      </>
    );
  }
  if (paletteId === "newsprint") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 60,
            right: 60,
            height: 1,
            background: palette.fg,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 60,
            right: 60,
            height: 1,
            background: palette.fg,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 60,
            right: 60,
            height: 4,
            background: palette.accent,
          }}
        />
      </>
    );
  }
  return null;
}

