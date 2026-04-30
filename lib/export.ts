"use client";
import { toPng } from "html-to-image";
import JSZip from "jszip";

export async function prepareForExport(root: HTMLElement) {
  // Wait for fonts (next/font self-hosted) to be loaded so html-to-image inlines them.
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }
  // Wait for every <img> in the export tree to be decoded so it paints reliably.
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        if (typeof img.decode === "function") return img.decode().catch(() => undefined);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    })
  );
}

export async function nodeToPng(node: HTMLElement, w: number, h: number): Promise<string> {
  return toPng(node, {
    width: w,
    height: h,
    pixelRatio: 1,
    cacheBust: true,
    skipFonts: false,
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

type ZipExtra =
  | { name: string; text: string }
  | { name: string; base64: string };

export async function downloadAllAsZip(
  pngs: { name: string; dataUrl: string }[],
  zipName: string,
  extras: ZipExtra[] = []
) {
  const zip = new JSZip();
  for (const p of pngs) {
    const base64 = p.dataUrl.split(",")[1] || "";
    zip.file(p.name, base64, { base64: true });
  }
  for (const e of extras) {
    if ("text" in e) zip.file(e.name, e.text);
    else zip.file(e.name, e.base64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlExtension(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/);
  const mime = m?.[1] ?? "";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1] ?? "";
}

export type ProjectZipImport = {
  project: unknown;
  images: Record<string, string>; // filename → data URL
};

export async function readProjectZip(file: File): Promise<ProjectZipImport> {
  const zip = await JSZip.loadAsync(file);
  let project: unknown = undefined;
  const projectFile = zip.file("carousel.json");
  if (projectFile) {
    const text = await projectFile.async("string");
    try {
      project = JSON.parse(text);
    } catch {
      project = undefined;
    }
  }
  const images: Record<string, string> = {};
  const imageFiles = zip.folder("images");
  if (imageFiles) {
    const entries: { path: string; file: JSZip.JSZipObject }[] = [];
    imageFiles.forEach((path, f) => {
      if (!f.dir) entries.push({ path, file: f });
    });
    for (const { path, file } of entries) {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mime =
        ext === "png" ? "image/png" :
        ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
        ext === "webp" ? "image/webp" :
        ext === "gif" ? "image/gif" :
        "application/octet-stream";
      const base64 = await file.async("base64");
      images[`images/${path}`] = `data:${mime};base64,${base64}`;
    }
  }
  return { project, images };
}
