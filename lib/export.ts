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

export async function downloadAllAsZip(
  pngs: { name: string; dataUrl: string }[],
  zipName: string
) {
  const zip = new JSZip();
  for (const p of pngs) {
    const base64 = p.dataUrl.split(",")[1] || "";
    zip.file(p.name, base64, { base64: true });
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
