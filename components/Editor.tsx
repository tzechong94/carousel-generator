"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_IMAGE_LAYOUTS,
  ASPECT_DIMS,
  attachIds,
  effectiveImageLayout,
  FOCAL_NEXT,
  hasTextOffset,
  IMAGE_LAYOUT_DEFAULT_FOR_TYPE,
  IMAGE_LAYOUT_LABEL,
  newSlideId,
  nextOverlayLevel,
  parseCarouselJson,
  type AspectRatio,
  type ImageFocal,
  type ImageLayout,
  type PaletteId,
  type Slide,
  type SlideData,
} from "@/lib/types";
import { PALETTE_LIST, PALETTES } from "@/lib/palettes";
import { SAMPLE_JSON } from "@/lib/sample";
import { downloadAllAsZip, downloadDataUrl, nodeToPng, prepareForExport } from "@/lib/export";
import { SlideCanvas } from "./SlideCanvas";
import { ArrowDownToLine, ArrowUpToLine, Circle, Contrast, Download, FileJson, HelpCircle, ImageIcon, Move, Plus, RotateCcw, Sparkles, Trash2, Upload, X } from "lucide-react";
import { HelpModal } from "./HelpModal";

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
  const [helpOpen, setHelpOpen] = useState(false);

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

  const onUploadImage = (id: string, dataUrl: string) => {
    setSlides((s) =>
      s.map((sl) => {
        if (sl.id !== id) return sl;
        return {
          ...sl,
          imageDataUrl: dataUrl,
          imageLayout: sl.imageLayout ?? IMAGE_LAYOUT_DEFAULT_FOR_TYPE[sl.type],
        } as Slide;
      })
    );
  };

  const setImageLayout = (id: string, layout: ImageLayout) => {
    updateSlide(id, { imageLayout: layout });
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
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
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
        onOpenHelp={() => setHelpOpen(true)}
      />
      <PreviewPane
        slides={slides}
        palette={palette}
        aspect={aspect}
        dims={dims}
        setStageRef={setStageRef}
        onUpload={onUploadImage}
        onRemoveImage={(id) => updateSlide(id, { imageDataUrl: undefined })}
        onCycleFocal={cycleFocal}
        onSetLayout={setImageLayout}
        onUpdateSlide={updateSlide}
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
  onOpenHelp,
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
  onOpenHelp: () => void;
}) {
  return (
    <aside className="w-[420px] flex-shrink-0 border-r border-[#1d1d20] flex flex-col">
      <header className="px-6 py-5 border-b border-[#1d1d20] flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#e8b86d]" />
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold tracking-tight">Carousel Generator</h1>
          <p className="text-xs text-[#7e7e83]">Instagram · {slidesCount} slide{slidesCount === 1 ? "" : "s"}</p>
        </div>
        <button
          onClick={onOpenHelp}
          aria-label="How to use"
          title="How to use"
          className="p-1.5 rounded-md text-[#7e7e83] hover:text-white hover:bg-white/5"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </header>

      <div className="px-6 py-4 border-b border-[#1d1d20] space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-[11px] uppercase tracking-[2px] text-[#7e7e83]">Palette</label>
            <span className="text-[10px] text-[#5a5a5e]">{PALETTE_LIST.length} themes</span>
          </div>
          <div className="max-h-[168px] overflow-y-auto scroll-thin pr-1">
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
                  <div className="h-12 flex items-end justify-between p-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.preview.accent }} />
                      <span className="text-[11.5px] font-medium truncate" style={{ color: p.preview.fg }}>
                        {p.name}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
  onSetLayout,
  onUpdateSlide,
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
  onSetLayout: (id: string, layout: ImageLayout) => void;
  onUpdateSlide: (id: string, patch: Partial<Slide>) => void;
  onRemoveSlide: (id: string) => void;
  onAddSlide: (afterIndex: number, type: SlideData["type"]) => void;
  onExportSlide: (slide: Slide, idx: number) => void;
  exportingNow: boolean;
}) {
  const targetH = aspect === "4:5" ? 600 : 520;
  const scale = targetH / dims.h;
  const displayW = Math.round(dims.w * scale);
  const displayH = Math.round(dims.h * scale);

  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    startDx: number;
    startDy: number;
  } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      onUpdateSlide(drag.id, {
        textOffset: { dx: drag.startDx + dx, dy: drag.startDy + dy },
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [drag, scale, onUpdateSlide]);

  const startDrag = (slide: Slide, e: React.MouseEvent) => {
    e.preventDefault();
    const offset = slide.textOffset ?? { dx: 0, dy: 0 };
    setDrag({
      id: slide.id,
      startX: e.clientX,
      startY: e.clientY,
      startDx: offset.dx,
      startDy: offset.dy,
    });
  };

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
                {hasTextOffset(slide) && (
                  <IconBtn
                    title="Reset text position"
                    onClick={() => onUpdateSlide(slide.id, { textOffset: undefined })}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </IconBtn>
                )}
                {slide.imageDataUrl && (
                  <DimBtn
                    overlay={slide.imageOverlay ?? 0}
                    onClick={() =>
                      onUpdateSlide(slide.id, {
                        imageOverlay: nextOverlayLevel(slide.imageOverlay),
                      })
                    }
                  />
                )}
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
            {slide.imageDataUrl && (
              <LayoutPicker
                current={effectiveImageLayout(slide)}
                onSelect={(l) => onSetLayout(slide.id, l)}
              />
            )}
            <div
              onMouseDown={(e) => startDrag(slide, e)}
              style={{
                width: displayW,
                height: displayH,
                cursor: drag?.id === slide.id ? "grabbing" : "grab",
              }}
              className="relative shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] rounded-md overflow-hidden ring-1 ring-[#1d1d20] select-none"
              title="Drag to reposition text"
            >
              <div
                style={{
                  width: dims.w,
                  height: dims.h,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
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
              {drag?.id === slide.id && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-mono pointer-events-none">
                  <Move className="inline w-3 h-3 mr-1" />
                  {Math.round(slide.textOffset?.dx ?? 0)}, {Math.round(slide.textOffset?.dy ?? 0)}
                </div>
              )}
            </div>

            <InsertSlideRow onInsert={(t) => onAddSlide(i, t)} />
          </div>
        ))}
      </div>
    </main>
  );
}

function LayoutPicker({
  current,
  onSelect,
}: {
  current: ImageLayout;
  onSelect: (l: ImageLayout) => void;
}) {
  return (
    <div className="w-full flex items-center justify-end gap-1.5">
      <span className="text-[10px] uppercase tracking-[2px] text-[#5a5a5e] mr-1">Layout</span>
      {ALL_IMAGE_LAYOUTS.map((l) => {
        const active = current === l;
        return (
          <button
            key={l}
            onClick={() => onSelect(l)}
            title={IMAGE_LAYOUT_LABEL[l]}
            aria-label={`Image layout: ${IMAGE_LAYOUT_LABEL[l]}`}
            aria-pressed={active}
            className={`p-1.5 rounded border transition ${
              active
                ? "bg-white text-black border-white"
                : "border-[#27272a] hover:border-[#404044] text-[#c8c8cb] hover:text-white"
            }`}
          >
            <LayoutIcon kind={l} className="w-4 h-5" />
          </button>
        );
      })}
    </div>
  );
}

function LayoutIcon({ kind, className }: { kind: ImageLayout; className?: string }) {
  const stroke = "currentColor";
  const fill = "currentColor";
  if (kind === "full") {
    return (
      <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
        <rect x="1" y="1" width="14" height="18" fill={fill} rx="1.5" />
      </svg>
    );
  }
  if (kind === "top") {
    return (
      <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
        <rect x="1" y="1" width="14" height="9" fill={fill} rx="1.5" />
        <rect x="1" y="11" width="14" height="8" fill="none" stroke={stroke} rx="1.5" />
      </svg>
    );
  }
  if (kind === "bottom") {
    return (
      <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
        <rect x="1" y="1" width="14" height="8" fill="none" stroke={stroke} rx="1.5" />
        <rect x="1" y="10" width="14" height="9" fill={fill} rx="1.5" />
      </svg>
    );
  }
  if (kind === "left") {
    return (
      <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
        <rect x="1" y="1" width="6.5" height="18" fill={fill} rx="1.5" />
        <rect x="8.5" y="1" width="6.5" height="18" fill="none" stroke={stroke} rx="1.5" />
      </svg>
    );
  }
  if (kind === "right") {
    return (
      <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
        <rect x="1" y="1" width="6.5" height="18" fill="none" stroke={stroke} rx="1.5" />
        <rect x="8.5" y="1" width="6.5" height="18" fill={fill} rx="1.5" />
      </svg>
    );
  }
  // circle
  return (
    <svg viewBox="0 0 16 20" className={className} aria-hidden="true">
      <rect x="1" y="1" width="14" height="18" fill="none" stroke={stroke} rx="1.5" />
      <circle cx="8" cy="7" r="3" fill={fill} />
      <line x1="4" y1="13" x2="12" y2="13" stroke={stroke} strokeWidth="1.2" />
      <line x1="5" y1="16" x2="11" y2="16" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

function DimBtn({ overlay, onClick }: { overlay: number; onClick: () => void }) {
  const pct = Math.round(overlay * 100);
  return (
    <button
      onClick={onClick}
      title={`Image dim: ${pct}% (click to cycle)`}
      className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium text-[#c8c8cb] hover:text-white border border-[#27272a] hover:border-[#404044]"
    >
      <Contrast className="w-3.5 h-3.5" />
      <span>{pct}%</span>
    </button>
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
