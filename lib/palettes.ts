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
    display: "grotesk",
    body: "grotesk",
  },
};

export const PALETTE_LIST: PaletteSpec[] = [PALETTES.noir, PALETTES.pastel, PALETTES.gradient, PALETTES.swiss];

export function fontClass(kind: "serif" | "grotesk" | "sans"): string {
  if (kind === "serif") return "font-serif-display";
  if (kind === "grotesk") return "font-grotesk";
  return "font-sans-display";
}
