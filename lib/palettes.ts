import type { PaletteId } from "./types";

export type PaletteSpec = {
  id: PaletteId;
  name: string;
  preview: { bg: string; fg: string; accent: string };
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  scrim: string;
  /** Flat color used for the per-slide image overlay. Tints toward bg for light palettes, toward black for dark ones. */
  overlayTint: string;
  display: "serif" | "grotesk" | "sans";
  body: "serif" | "grotesk" | "sans";
};

export const PALETTES: Record<PaletteId, PaletteSpec> = {
  noir: {
    id: "noir",
    name: "Noir editorial",
    preview: { bg: "#0d0d0e", fg: "#f3ead8", accent: "#e8b86d" },
    bg: "#0d0d0e",
    fg: "#f3ead8",
    muted: "#a8a195",
    accent: "#e8b86d",
    scrim: "linear-gradient(180deg, rgba(13,13,14,0) 30%, rgba(13,13,14,0.85) 100%)",
    overlayTint: "#000000",
    display: "serif",
    body: "sans",
  },
  pastel: {
    id: "pastel",
    name: "Soft pastel",
    preview: { bg: "#f5efe6", fg: "#4a3c30", accent: "#d98a6c" },
    bg: "#f5efe6",
    fg: "#4a3c30",
    muted: "#8a7a68",
    accent: "#d98a6c",
    scrim: "linear-gradient(180deg, rgba(74,60,48,0) 40%, rgba(74,60,48,0.6) 100%)",
    overlayTint: "#f5efe6",
    display: "sans",
    body: "sans",
  },
  gradient: {
    id: "gradient",
    name: "Bold gradient",
    preview: { bg: "linear-gradient(135deg,#7b2ff7,#f107a3,#ff7b00)", fg: "#ffffff", accent: "#fff200" },
    bg: "linear-gradient(135deg,#7b2ff7 0%, #f107a3 50%, #ff7b00 100%)",
    fg: "#ffffff",
    muted: "rgba(255,255,255,0.8)",
    accent: "#fff200",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
    overlayTint: "#000000",
    display: "grotesk",
    body: "grotesk",
  },
  swiss: {
    id: "swiss",
    name: "Minimal Swiss",
    preview: { bg: "#ffffff", fg: "#0a0a0a", accent: "#e63946" },
    bg: "#ffffff",
    fg: "#0a0a0a",
    muted: "#6b6b6b",
    accent: "#e63946",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)",
    overlayTint: "#ffffff",
    display: "grotesk",
    body: "grotesk",
  },
  sage: {
    id: "sage",
    name: "Sage & terracotta",
    preview: { bg: "#e6e3d3", fg: "#2f3a2f", accent: "#c47b56" },
    bg: "#e6e3d3",
    fg: "#2f3a2f",
    muted: "#67705f",
    accent: "#c47b56",
    scrim: "linear-gradient(180deg, rgba(47,58,47,0) 40%, rgba(47,58,47,0.65) 100%)",
    overlayTint: "#e6e3d3",
    display: "serif",
    body: "sans",
  },
  mocha: {
    id: "mocha",
    name: "Mocha mousse",
    preview: { bg: "#1f1612", fg: "#ead7c0", accent: "#a47864" },
    bg: "#1f1612",
    fg: "#ead7c0",
    muted: "#a4937d",
    accent: "#c9a27e",
    scrim: "linear-gradient(180deg, rgba(31,22,18,0) 30%, rgba(31,22,18,0.85) 100%)",
    overlayTint: "#000000",
    display: "serif",
    body: "sans",
  },
  dopamine: {
    id: "dopamine",
    name: "Dopamine pop",
    preview: { bg: "#fff7d6", fg: "#0a0a0a", accent: "#ff2d8a" },
    bg: "#fff7d6",
    fg: "#0a0a0a",
    muted: "#5a5a5a",
    accent: "#ff2d8a",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
    overlayTint: "#fff7d6",
    display: "grotesk",
    body: "grotesk",
  },
  newsprint: {
    id: "newsprint",
    name: "Newsprint",
    preview: { bg: "#f1ece0", fg: "#0a0a0a", accent: "#c8362e" },
    bg: "#f1ece0",
    fg: "#0a0a0a",
    muted: "#535353",
    accent: "#c8362e",
    scrim: "linear-gradient(180deg, rgba(10,10,10,0) 40%, rgba(10,10,10,0.65) 100%)",
    overlayTint: "#f1ece0",
    display: "serif",
    body: "sans",
  },
  hotsource: {
    id: "hotsource",
    name: "Hotsource",
    preview: { bg: "#faf8f5", fg: "#111111", accent: "#c63f1a" },
    bg: "#faf8f5",
    fg: "#111111",
    muted: "#6b6b68",
    accent: "#c63f1a",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)",
    overlayTint: "#faf8f5",
    display: "grotesk",
    body: "grotesk",
  },
};

export const PALETTE_LIST: PaletteSpec[] = [
  PALETTES.hotsource,
  PALETTES.noir,
  PALETTES.pastel,
  PALETTES.gradient,
  PALETTES.swiss,
  PALETTES.sage,
  PALETTES.mocha,
  PALETTES.dopamine,
  PALETTES.newsprint,
];

export function fontClass(kind: "serif" | "grotesk" | "sans"): string {
  if (kind === "serif") return "font-serif-display";
  if (kind === "grotesk") return "font-grotesk";
  return "font-sans-display";
}

export type PaletteFrame = { inset: number; radius?: number };

export function getPaletteFrame(id: PaletteId): PaletteFrame {
  switch (id) {
    case "noir":
      return { inset: 26 };
    case "pastel":
      return { inset: 24, radius: 28 };
    case "sage":
      return { inset: 24 };
    case "mocha":
      return { inset: 30 };
    case "hotsource":
      return { inset: 28, radius: 20 };
    default:
      return { inset: 0 };
  }
}

type FrameCorners = "all" | "top" | "bottom" | "left" | "right" | "none";

export function radiusForCorners(radius: number | undefined, corners: FrameCorners): string | number | undefined {
  if (!radius) return undefined;
  const r = radius;
  if (corners === "all") return r;
  if (corners === "top") return `${r}px ${r}px 0 0`;
  if (corners === "bottom") return `0 0 ${r}px ${r}px`;
  if (corners === "left") return `${r}px 0 0 ${r}px`;
  if (corners === "right") return `0 ${r}px ${r}px 0`;
  return undefined;
}
