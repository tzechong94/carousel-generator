export type AspectRatio = "1:1" | "4:5";

export const ASPECT_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

export type PaletteId =
  | "noir"
  | "pastel"
  | "gradient"
  | "swiss"
  | "sage"
  | "mocha"
  | "dopamine"
  | "newsprint"
  | "hotsource";

export type CoverSlide = {
  type: "cover";
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export type ContentSlide = {
  type: "content";
  index?: number;
  heading: string;
  body?: string;
  bullets?: string[];
};

export type CtaSlide = {
  type: "cta";
  title: string;
  subtitle?: string;
  handle?: string;
};

export type SlideData = CoverSlide | ContentSlide | CtaSlide;

export type ImageFocal = "top" | "center" | "bottom";

export type ImageLayout = "full" | "top" | "bottom" | "left" | "right" | "circle";

export const ALL_IMAGE_LAYOUTS: ImageLayout[] = ["full", "top", "bottom", "left", "right", "circle"];

export const IMAGE_LAYOUT_DEFAULT_FOR_TYPE: Record<SlideData["type"], ImageLayout> = {
  cover: "full",
  content: "top",
  cta: "circle",
};

export const IMAGE_LAYOUT_LABEL: Record<ImageLayout, string> = {
  full: "Full",
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
  circle: "Circle",
};

export type TextTone = "auto" | "light" | "dark";

export type HandleAlign = "left" | "center" | "right";

export const HANDLE_ALIGN_NEXT: Record<HandleAlign, HandleAlign> = {
  left: "center",
  center: "right",
  right: "left",
};

export type Slide = SlideData & {
  id: string;
  imageDataUrl?: string;
  imageFocal?: ImageFocal;
  imageLayout?: ImageLayout;
  textOffset?: { dx: number; dy: number };
  handleOffset?: { dx: number; dy: number };
  handleAlign?: HandleAlign;
  imageOverlay?: number;
  textTone?: TextTone;
  textScale?: number;
};

export const TEXT_SCALES = [0.85, 1.0, 1.15, 1.3] as const;

export function nextTextScale(current: number | undefined): number {
  const cur = current ?? 1.0;
  const idx = TEXT_SCALES.findIndex((s) => Math.abs(s - cur) < 0.01);
  const nextIdx = (idx + 1) % TEXT_SCALES.length;
  return TEXT_SCALES[nextIdx];
}

export const TEXT_TONE_NEXT: Record<TextTone, TextTone> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

export const OVERLAY_LEVELS = [0, 0.2, 0.4, 0.6, 0.8] as const;

export function nextOverlayLevel(current: number | undefined): number {
  const cur = current ?? 0;
  const idx = OVERLAY_LEVELS.findIndex((l) => Math.abs(l - cur) < 0.001);
  const nextIdx = (idx + 1) % OVERLAY_LEVELS.length;
  return OVERLAY_LEVELS[nextIdx];
}

export function hasTextOffset(s: Slide): boolean {
  if (!s.textOffset) return false;
  return Math.abs(s.textOffset.dx) > 0.5 || Math.abs(s.textOffset.dy) > 0.5;
}

export function hasHandleOffset(s: Slide): boolean {
  if (!s.handleOffset) return false;
  return Math.abs(s.handleOffset.dx) > 0.5 || Math.abs(s.handleOffset.dy) > 0.5;
}

export function effectiveImageLayout(slide: Slide): ImageLayout {
  return slide.imageLayout ?? IMAGE_LAYOUT_DEFAULT_FOR_TYPE[slide.type];
}

export const FOCAL_NEXT: Record<ImageFocal, ImageFocal> = {
  top: "center",
  center: "bottom",
  bottom: "top",
};

export function focalToObjectPosition(f: ImageFocal | undefined): string {
  if (f === "top") return "center top";
  if (f === "bottom") return "center bottom";
  return "center center";
}

export type CarouselDoc = {
  palette: PaletteId;
  slides: SlideData[];
};

const PALETTE_IDS = new Set<string>([
  "noir",
  "pastel",
  "gradient",
  "swiss",
  "sage",
  "mocha",
  "dopamine",
  "newsprint",
  "hotsource",
]);

export function isPaletteId(v: unknown): v is PaletteId {
  return typeof v === "string" && PALETTE_IDS.has(v);
}

export function parseCarouselJson(text: string): { ok: true; doc: CarouselDoc } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: "Invalid JSON: " + (e as Error).message };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Root must be an object" };
  const obj = raw as Record<string, unknown>;
  const palette = obj.palette;
  if (!isPaletteId(palette)) {
    return {
      ok: false,
      error:
        'palette must be one of: "noir" | "pastel" | "gradient" | "swiss" | "sage" | "mocha" | "dopamine" | "newsprint" | "hotsource"',
    };
  }
  const slidesRaw = obj.slides;
  if (!Array.isArray(slidesRaw)) return { ok: false, error: "slides must be an array" };
  const slides: SlideData[] = [];
  for (let i = 0; i < slidesRaw.length; i++) {
    const s = slidesRaw[i] as Record<string, unknown>;
    if (!s || typeof s !== "object") return { ok: false, error: `slides[${i}] must be an object` };
    const t = s.type;
    if (t === "cover") {
      if (typeof s.title !== "string") return { ok: false, error: `slides[${i}].title required (string)` };
      slides.push({
        type: "cover",
        title: s.title,
        eyebrow: typeof s.eyebrow === "string" ? s.eyebrow : undefined,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : undefined,
      });
    } else if (t === "content") {
      if (typeof s.heading !== "string") return { ok: false, error: `slides[${i}].heading required (string)` };
      slides.push({
        type: "content",
        heading: s.heading,
        body: typeof s.body === "string" ? s.body : undefined,
        index: typeof s.index === "number" ? s.index : undefined,
        bullets: Array.isArray(s.bullets) ? s.bullets.filter((b): b is string => typeof b === "string") : undefined,
      });
    } else if (t === "cta") {
      if (typeof s.title !== "string") return { ok: false, error: `slides[${i}].title required (string)` };
      slides.push({
        type: "cta",
        title: s.title,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : undefined,
        handle: typeof s.handle === "string" ? s.handle : undefined,
      });
    } else {
      return { ok: false, error: `slides[${i}].type must be "cover" | "content" | "cta"` };
    }
  }
  return { ok: true, doc: { palette, slides } };
}

let _id = 0;
export function newSlideId(): string {
  _id += 1;
  return `s_${Date.now().toString(36)}_${_id}`;
}

export function attachIds(slides: SlideData[]): Slide[] {
  return slides.map((s) => ({ ...s, id: newSlideId() }));
}
