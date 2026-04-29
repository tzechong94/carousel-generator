"use client";
import { useEffect } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Circle,
  Download,
  FileJson,
  ImageIcon,
  Keyboard,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const SAMPLE_SNIPPET = `{
  "palette": "noir",
  "slides": [
    {
      "type": "cover",
      "eyebrow": "GUIDE",
      "title": "Your hook here",
      "subtitle": "Optional supporting line"
    },
    {
      "type": "content",
      "index": 1,
      "heading": "Heading line",
      "body": "Optional body copy.",
      "bullets": ["optional bullet", "another"]
    },
    {
      "type": "cta",
      "title": "Save this post",
      "subtitle": "Follow for more",
      "handle": "@yourhandle"
    }
  ]
}`;

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="How to use"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] max-h-[88vh] overflow-y-auto scroll-thin bg-[#111114] border border-[#1d1d20] rounded-xl shadow-2xl"
      >
        <header className="sticky top-0 z-10 bg-[#111114]/95 backdrop-blur px-7 py-5 border-b border-[#1d1d20] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#e8b86d]" />
            <h2 className="text-[16px] font-semibold tracking-tight">How to use</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md text-[#7e7e83] hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-7 py-6 space-y-7 text-[14px] leading-[1.55] text-[#c8c8cb]">
          <Step
            n={1}
            icon={<FileJson className="w-4 h-4" />}
            title="Paste your content as JSON"
            body={
              <>
                Edit the JSON in the left panel. Three slide types are supported:{" "}
                <Code>cover</Code>, <Code>content</Code>, <Code>cta</Code>. Click{" "}
                <kbd className="kbd">Apply JSON</kbd> or hit{" "}
                <kbd className="kbd">⌘ Enter</kbd> to render.
              </>
            }
          >
            <pre className="mt-3 bg-[#0b0b0c] border border-[#1d1d20] rounded-md p-3.5 text-[11.5px] leading-[1.55] font-mono text-[#a8a8ac] overflow-x-auto scroll-thin">
{SAMPLE_SNIPPET}
            </pre>
          </Step>

          <Step
            n={2}
            icon={<Palette className="w-4 h-4" />}
            title="Pick a palette and aspect ratio"
            body={
              <>
                Four palettes — <em>Noir editorial</em>, <em>Soft pastel</em>,{" "}
                <em>Bold gradient</em>, <em>Minimal Swiss</em>. Toggle between{" "}
                <Code>4:5</Code> portrait (1080×1350) and <Code>1:1</Code> square
                (1080×1080) anytime.
              </>
            }
          />

          <Step
            n={3}
            icon={<ImageIcon className="w-4 h-4" />}
            title="Add an image to any slide"
            body={
              <>
                Click <kbd className="kbd">Image</kbd> on a slide row to upload. The
                image renders by slide type — cover gets full-bleed with a scrim,
                content puts it on top as a hero, CTA uses it as a circular avatar.
                Cycle focal point with{" "}
                <span className="inline-flex items-center gap-1 align-middle">
                  <ArrowUpToLine className="w-3 h-3" /> /{" "}
                  <Circle className="w-3 h-3" /> /{" "}
                  <ArrowDownToLine className="w-3 h-3" />
                </span>{" "}
                to reframe top / center / bottom.
              </>
            }
          />

          <Step
            n={4}
            icon={<Plus className="w-4 h-4" />}
            title="Add or remove slides"
            body={
              <>
                Use the <Code>Insert below</Code> chips beneath any slide to add a
                new <Code>cover</Code>, <Code>content</Code>, or <Code>cta</Code>{" "}
                card. Remove with the{" "}
                <span className="inline-flex items-center align-middle text-[#ff8888]">
                  <Trash2 className="w-3.5 h-3.5" />
                </span>{" "}
                button on each slide.
              </>
            }
          />

          <Step
            n={5}
            icon={<Download className="w-4 h-4" />}
            title="Export as PNG"
            body={
              <>
                Click <kbd className="kbd">Download</kbd> on a single slide for one
                PNG, or use <kbd className="kbd">Export all as ZIP</kbd> in the
                bottom-left to bundle every slide. PNGs render at native{" "}
                <Code>1080×1080</Code> or <Code>1080×1350</Code>.
              </>
            }
          />

          <div className="pt-2 border-t border-[#1d1d20]">
            <div className="flex items-start gap-3 text-[13px]">
              <Keyboard className="w-4 h-4 mt-0.5 text-[#7e7e83] flex-shrink-0" />
              <div className="space-y-1.5">
                <div>
                  <kbd className="kbd">⌘ Enter</kbd> in the JSON box — apply changes
                </div>
                <div>
                  <kbd className="kbd">Esc</kbd> — close this dialog
                </div>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[#7e7e83] leading-[1.5]">
            Everything runs in your browser. Nothing is uploaded. Your palette, JSON,
            and slide structure persist locally; uploaded images clear on refresh.
          </p>
        </div>

        <footer className="sticky bottom-0 bg-[#111114]/95 backdrop-blur border-t border-[#1d1d20] px-7 py-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-md hover:bg-[#e7e7e9]"
          >
            Got it
          </button>
        </footer>
      </div>

      <style>{`
        .kbd {
          display: inline-flex;
          align-items: center;
          padding: 1px 6px;
          font-family: ui-monospace, "JetBrains Mono", Menlo, monospace;
          font-size: 11.5px;
          color: #e7e7e9;
          background: #1a1a1d;
          border: 1px solid #2a2a2d;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1d] border border-[#2a2a2d] flex items-center justify-center text-[12px] font-semibold text-[#e8b86d]">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-[14.5px] font-semibold flex items-center gap-2 mb-1.5">
          <span className="text-[#7e7e83]">{icon}</span>
          {title}
        </h3>
        <div className="text-[#a8a8ac]">{body}</div>
        {children}
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[12px] bg-[#1a1a1d] border border-[#2a2a2d] rounded text-[#e7e7e9] font-mono">
      {children}
    </code>
  );
}
