export type AspectRatio = "1:1" | "4:5";

export const ASPECT_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

export type PaletteId = "noir" | "pastel" | "gradient" | "swiss";

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

export type Slide = SlideData & {
  id: string;
  imageDataUrl?: string;
  imageFocal?: ImageFocal;
};

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

export function isPaletteId(v: unknown): v is PaletteId {
  return v === "noir" || v === "pastel" || v === "gradient" || v === "swiss";
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
    return { ok: false, error: 'palette must be "noir" | "pastel" | "gradient" | "swiss"' };
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
