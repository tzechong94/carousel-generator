"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASPECT_DIMS,
  attachIds,
  FOCAL_NEXT,
  newSlideId,
  parseCarouselJson,
  type AspectRatio,
  type ImageFocal,
  type PaletteId,
  type Slide,
  type SlideData,
} from "@/lib/types";
import { PALETTE_LIST, PALETTES } from "@/lib/palettes";
import { SAMPLE_JSON } from "@/lib/sample";
import { downloadAllAsZip, downloadDataUrl, nodeToPng, prepareForExport } from "@/lib/export";
import { SlideCanvas } from "./SlideCanvas";
import { ArrowDownToLine, ArrowUpToLine, Circle, Download, FileJson, ImageIcon, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";

const STORAGE_KEY = "carousel-generator:v1";

type SavedState = {
  palette: PaletteId;
  aspect: AspectRatio;
  jsonText: string;
  slides: Omit<Slide, "imageDataUrl">[];
};

function loadState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data as SavedState;
  } catch {
    return null;
  }
}

function saveState(state: SavedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or disabled storage — silently ignore
  }
}

const DEFAULT_DOC = (() => {
  const r = parseCarouselJson(SAMPLE_JSON);
  if (r.ok) return r.doc;
  return { palette: "noir" as PaletteId, slides: [] as SlideData[] };
})();

export default function Editor() {
  const initial = (() => {
    const saved = loadState();
    if (saved && saved.palette && Array.isArray(saved.slides)) {
      return {
        palette: saved.palette,
        aspect: saved.aspect ?? ("4:5" as AspectRatio),
        jsonText: typeof saved.jsonText === "string" ? saved.jsonText : SAMPLE_JSON,
        slides: saved.slides.map((s) => ({ ...s })) as Slide[],
      };
    }
    return {
      palette: DEFAULT_DOC.palette,
      aspect: "4:5" as AspectRatio,
      jsonText: SAMPLE_JSON,
      slides: attachIds(DEFAULT_DOC.slides),
    };
  })();

  const [palette, setPalette] = useState<PaletteId>(initial.palette);
  const [aspect, setAspect] = useState<AspectRatio>(initial.aspect);
  const [slides, setSlides] = useState<Slide[]>(initial.slides);
  const [jsonText, setJsonText] = useState<string>(initial.jsonText);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<{ kind: "one" } | { kind: "all"; done: number; total: number } | null>(null);
  const [showJson, setShowJson] = useState(true);

  // Persist (debounced) — strip image data URLs to avoid blowing localStorage quota.
  useEffect(() => {
    const t = setTimeout(() => {
      saveState({
        palette,
        aspect,
        jsonText,
        slides: slides.map(({ imageDataUrl, ...rest }) => rest),
      });
    }, 250);
    return () => clearTimeout(t);
  }, [palette, aspect, jsonText, slides]);

  const stageRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const setStageRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) stageRefs.current.set(id, el);
      else stageRefs.current.delete(id);
    },
    []
  );

  const dims = ASPECT_DIMS[aspect];

  const applyJson = useCallback(() => {
    const r = parseCarouselJson(jsonText);
    if (!r.ok) {
      setJsonError(r.error);
      return;
    }
    setJsonError(null);
    setPalette(r.doc.palette);
    setSlides((prev) => {
      const next = attachIds(r.doc.slides);
      for (let i = 0; i < next.length && i < prev.length; i++) {
        if (next[i].type === prev[i].type) {
          if (prev[i].imageDataUrl) next[i].imageDataUrl = prev[i].imageDataUrl;
          if (prev[i].imageFocal) next[i].imageFocal = prev[i].imageFocal;
        }
      }
      return next;
    });
  }, [jsonText]);

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    setSlides((s) => s.map((sl) => (sl.id === id ? ({ ...sl, ...patch } as Slide) : sl)));
  };

  const cycleFocal = (id: string) => {
    setSlides((s) =>
      s.map((sl) => {
        if (sl.id !== id) return sl;
        const cur: ImageFocal = sl.imageFocal ?? "center";
        return { ...sl, imageFocal: FOCAL_NEXT[cur] } as Slide;
      })
    );
  };

  const removeSlide = (id: string) => {
    setSlides((s) => s.filter((sl) => sl.id !== id));
  };

  const addSlide = (afterIndex: number, type: SlideData["type"]) => {
    const newSlide: Slide = (() => {
      const id = newSlideId();
      if (type === "cover") return { id, type: "cover", title: "New cover title", subtitle: "Subtitle goes here", eyebrow: "TAG" };
      if (type === "cta") return { id, type: "cta", title: "Save this post", subtitle: "Follow for more", handle: "@yourhandle" };
      return { id, type: "content", heading: "New heading", body: "Body copy. Replace me.", index: afterIndex + 2 };
    })();
    setSlides((s) => [...s.slice(0, afterIndex + 1), newSlide, ...s.slice(afterIndex + 1)]);
  };

  const exportSlide = async (slide: Slide, idx: number) => {
    const node = stageRefs.current.get(slide.id);
    if (!node) return;
    setExporting({ kind: "one" });
    try {
      await prepareForExport(node);
      const dataUrl = await nodeToPng(node, dims.w, dims.h);
      const filename = `slide-${String(idx + 1).padStart(2, "0")}.png`;
      downloadDataUrl(dataUrl, filename);
    } finally {
      setExporting(null);
    }
  };

  const exportAll = async () => {
    const total = slides.length;
    setExporting({ kind: "all", done: 0, total });
    try {
      const pngs: { name: string; dataUrl: string }[] = [];
      for (let i = 0; i < slides.length; i++) {
        const node = stageRefs.current.get(slides[i].id);
        if (!node) continue;
        await prepareForExport(node);
        const dataUrl = await nodeToPng(node, dims.w, dims.h);
        pngs.push({ name: `slide-${String(i + 1).padStart(2, "0")}.png`, dataUrl });
        setExporting({ kind: "all", done: i + 1, total });
      }
      await downloadAllAsZip(pngs, `carousel-${palette}-${aspect.replace(":", "x")}.zip`);
    } finally {
      setExporting(null);
    }
  };

  const exportingNow = exporting !== null;
  const exportLabel =
    exporting?.kind === "all"
      ? `Exporting ${exporting.done} / ${exporting.total}…`
      : exporting?.kind === "one"
        ? "Exporting…"
        : `Export all as ZIP (${slides.length})`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0b0c] text-[#e7e7e9]">
      <Sidebar
        palette={palette}
        setPalette={setPalette}
        aspect={aspect}
        setAspect={setAspect}
        jsonText={jsonText}
        setJsonText={setJsonText}
        jsonError={jsonError}
        applyJson={applyJson}
        showJson={showJson}
        setShowJson={setShowJson}
        slidesCount={slides.length}
        onExportAll={exportAll}
        exportingNow={exportingNow}
        exportLabel={exportLabel}
      />
      <PreviewPane
        slides={slides}
        palette={palette}
        aspect={aspect}
        dims={dims}
        setStageRef={setStageRef}
        onUpload={(id, dataUrl) => updateSlide(id, { imageDataUrl: dataUrl })}
        onRemoveImage={(id) => updateSlide(id, { imageDataUrl: undefined })}
        onCycleFocal={cycleFocal}
        onRemoveSlide={removeSlide}
        onAddSlide={addSlide}
        onExportSlide={exportSlide}
        exportingNow={exportingNow}
      />
    </div>
  );
}

function Sidebar({
  palette,
  setPalette,
  aspect,
  setAspect,
  jsonText,
  setJsonText,
  jsonError,
  applyJson,
  showJson,
  setShowJson,
  slidesCount,
  onExportAll,
  exportingNow,
  exportLabel,
}: {
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
  aspect: AspectRatio;
  setAspect: (a: AspectRatio) => void;
  jsonText: string;
  setJsonText: (s: string) => void;
  jsonError: string | null;
  applyJson: () => void;
  showJson: boolean;
  setShowJson: (b: boolean) => void;
  slidesCount: number;
  onExportAll: () => void;
  exportingNow: boolean;
  exportLabel: string;
}) {
  return (
    <aside className="w-[420px] flex-shrink-0 border-r border-[#1d1d20] flex flex-col">
      <header className="px-6 py-5 border-b border-[#1d1d20] flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#e8b86d]" />
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Carousel Generator</h1>
          <p className="text-xs text-[#7e7e83]">Instagram · {slidesCount} slide{slidesCount === 1 ? "" : "s"}</p>
        </div>
      </header>

      <div className="px-6 py-5 border-b border-[#1d1d20] space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[2px] text-[#7e7e83] mb-2">Palette</label>
          <div className="grid grid-cols-2 gap-2">
            {PALETTE_LIST.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={`group relative rounded-md overflow-hidden border transition ${
                  palette === p.id ? "border-white/80" : "border-[#27272a] hover:border-[#404044]"
                }`}
                style={{ background: p.preview.bg }}
              >
                <div className="h-14 flex items-end justify-between p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="block w-2.5 h-2.5 rounded-full" style={{ background: p.preview.accent }} />
                    <span className="text-[12px] font-medium" style={{ color: p.preview.fg }}>
                      {p.name}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-[2px] text-[#7e7e83] mb-2">Aspect ratio</label>
          <div className="grid grid-cols-2 gap-2">
            {(["4:5", "1:1"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                  aspect === a
                    ? "bg-white text-black border-white"
                    : "border-[#27272a] hover:border-[#404044] text-[#c8c8cb]"
                }`}
              >
                {a === "4:5" ? "4:5 portrait" : "1:1 square"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <button
          onClick={() => setShowJson(!showJson)}
          className="px-6 py-3 border-b border-[#1d1d20] flex items-center justify-between text-[11px] uppercase tracking-[2px] text-[#7e7e83] hover:text-white"
        >
          <span className="flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5" /> JSON Input
          </span>
          <span>{showJson ? "−" : "+"}</span>
        </button>
        {showJson && (
          <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  applyJson();
                }
              }}
              className="flex-1 min-h-0 w-full font-mono text-[11.5px] leading-[1.55] bg-[#111114] border border-[#1d1d20] rounded-md p-3 resize-none text-[#d4d4d8] focus:outline-none focus:border-[#3a3a40] scroll-thin"
              placeholder="Paste JSON here…"
            />
            {jsonError && (
              <div className="text-[12px] text-[#ff8888] bg-[#2a1414] border border-[#3a1c1c] rounded-md px-3 py-2">
                {jsonError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={applyJson}
                className="flex-1 bg-white text-black text-sm font-medium px-4 py-2 rounded-md hover:bg-[#e7e7e9]"
                title="⌘+Enter to apply"
              >
                Apply JSON
              </button>
              <button
                onClick={() => setJsonText(SAMPLE_JSON)}
                className="text-sm px-3 py-2 rounded-md border border-[#27272a] hover:border-[#404044] text-[#c8c8cb]"
                title="Reset to sample"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-[#1d1d20]">
        <button
          onClick={onExportAll}
          disabled={exportingNow || slidesCount === 0}
          className="w-full bg-[#e8b86d] text-black text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-[#f0c483] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {exportLabel}
        </button>
        <p className="text-[10.5px] text-[#7e7e83] mt-2 leading-[1.5]">
          PNGs render at native 1080 × {ASPECT_DIMS[aspect].h}. Saved locally — images cleared on refresh.
        </p>
      </div>
    </aside>
  );
}

function PreviewPane({
  slides,
  palette,
  aspect,
  dims,
  setStageRef,
  onUpload,
  onRemoveImage,
  onCycleFocal,
  onRemoveSlide,
  onAddSlide,
  onExportSlide,
  exportingNow,
}: {
  slides: Slide[];
  palette: PaletteId;
  aspect: AspectRatio;
  dims: { w: number; h: number };
  setStageRef: (id: string) => (el: HTMLDivElement | null) => void;
  onUpload: (id: string, dataUrl: string) => void;
  onRemoveImage: (id: string) => void;
  onCycleFocal: (id: string) => void;
  onRemoveSlide: (id: string) => void;
  onAddSlide: (afterIndex: number, type: SlideData["type"]) => void;
  onExportSlide: (slide: Slide, idx: number) => void;
  exportingNow: boolean;
}) {
  const targetH = aspect === "4:5" ? 600 : 520;
  const scale = targetH / dims.h;
  const displayW = Math.round(dims.w * scale);
  const displayH = Math.round(dims.h * scale);

  return (
    <main className="flex-1 overflow-auto scroll-thin">
      <div className="min-h-full px-10 py-12 flex flex-col items-center gap-10">
        {slides.length === 0 && (
          <div className="text-center text-[#7e7e83] mt-32">
            <p className="text-lg">No slides yet.</p>
            <button
              onClick={() => onAddSlide(-1, "cover")}
              className="mt-4 px-4 py-2 rounded-md bg-white text-black text-sm font-medium"
            >
              Add a cover slide
            </button>
          </div>
        )}
        {slides.map((slide, i) => (
          <div key={slide.id} className="flex flex-col items-center gap-3 w-full max-w-[820px]">
            <div className="w-full flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[2px] text-[#7e7e83]">
                {String(i + 1).padStart(2, "0")} · {slide.type}
              </div>
              <div className="flex items-center gap-1.5">
                {slide.imageDataUrl && (
                  <FocalBtn
                    focal={slide.imageFocal ?? "center"}
                    onClick={() => onCycleFocal(slide.id)}
                  />
                )}
                <UploadButton
                  onPick={(url) => onUpload(slide.id, url)}
                  hasImage={!!slide.imageDataUrl}
                />
                {slide.imageDataUrl && (
                  <IconBtn title="Remove image" onClick={() => onRemoveImage(slide.id)}>
                    <X className="w-3.5 h-3.5" />
                  </IconBtn>
                )}
                <IconBtn title="Download this slide" onClick={() => onExportSlide(slide, i)} disabled={exportingNow}>
                  <Download className="w-3.5 h-3.5" />
                </IconBtn>
                <IconBtn title="Remove slide" onClick={() => onRemoveSlide(slide.id)} variant="danger">
                  <Trash2 className="w-3.5 h-3.5" />
                </IconBtn>
              </div>
            </div>
            <div
              style={{ width: displayW, height: displayH }}
              className="relative shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] rounded-md overflow-hidden ring-1 ring-[#1d1d20]"
            >
              <div
                style={{
                  width: dims.w,
                  height: dims.h,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <SlideCanvas
                  ref={setStageRef(slide.id)}
                  slide={slide}
                  paletteId={palette}
                  aspect={aspect}
                  pageNumber={i + 1}
                  totalPages={slides.length}
                  slideIndex={i}
                />
              </div>
            </div>

            <InsertSlideRow onInsert={(t) => onAddSlide(i, t)} />
          </div>
        ))}
      </div>
    </main>
  );
}

function FocalBtn({ focal, onClick }: { focal: ImageFocal; onClick: () => void }) {
  const Icon = focal === "top" ? ArrowUpToLine : focal === "bottom" ? ArrowDownToLine : Circle;
  const label = focal === "top" ? "Top" : focal === "bottom" ? "Bottom" : "Center";
  return (
    <button
      onClick={onClick}
      title={`Image focal: ${label} (click to cycle)`}
      className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium text-[#c8c8cb] hover:text-white border border-[#27272a] hover:border-[#404044]"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

function UploadButton({ onPick, hasImage }: { onPick: (dataUrl: string) => void; hasImage: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            const url = typeof reader.result === "string" ? reader.result : "";
            if (url) onPick(url);
          };
          reader.readAsDataURL(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium text-[#c8c8cb] hover:text-white border border-[#27272a] hover:border-[#404044]"
        title={hasImage ? "Replace image" : "Upload image"}
      >
        {hasImage ? <ImageIcon className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
        {hasImage ? "Replace" : "Image"}
      </button>
    </>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded border border-[#27272a] hover:border-[#404044] disabled:opacity-40 ${
        variant === "danger" ? "text-[#ff8888] hover:text-[#ffaaaa]" : "text-[#c8c8cb] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function InsertSlideRow({ onInsert }: { onInsert: (t: SlideData["type"]) => void }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="text-[10.5px] uppercase tracking-[2px] text-[#5a5a5e]">Insert below:</div>
      {(["cover", "content", "cta"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onInsert(t)}
          className="px-2.5 py-1 text-[11px] font-medium border border-[#1d1d20] hover:border-[#404044] text-[#7e7e83] hover:text-white rounded flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          {t}
        </button>
      ))}
    </div>
  );
}
