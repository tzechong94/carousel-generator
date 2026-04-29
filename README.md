# Carousel Generator

A frontend-only Instagram carousel designer. Paste structured JSON, pick a palette and layout, drop in images, and export PNGs ready for the feed. Everything runs in your browser — no uploads, no backend.

Open `http://localhost:3001` and use the in-app `?` help button anytime for a quick reference.

---

## 1. Paste your content as JSON

The left panel is a JSON editor. Click **Apply JSON** or hit **⌘ Enter / Ctrl Enter** to render. Click **Reset** to restore the sample.

Three slide types are supported:

```jsonc
{
  "palette": "noir",
  "slides": [
    {
      "type": "cover",
      "eyebrow": "GUIDE",      // optional, uppercase tag
      "title": "Big hook",     // required
      "subtitle": "Optional"   // optional
    },
    {
      "type": "content",
      "index": 1,              // optional, the big numeral
      "heading": "Required",
      "body": "Optional paragraph.",
      "bullets": ["optional", "list"]
    },
    {
      "type": "cta",
      "title": "Save this post",
      "subtitle": "Follow for more",
      "handle": "@yourhandle"
    }
  ]
}
```

Validation is strict — bad JSON or wrong fields produce an inline error.

---

## 2. Pick a palette + aspect ratio

**8 palettes**, scrollable in the sidebar:

| Palette | Vibe |
|---|---|
| Noir editorial | high-contrast black + cream + gold serif |
| Soft pastel | warm cream + rounded inner stroke |
| Bold gradient | purple → pink → orange, hue rotates per slide |
| Minimal Swiss | white + red, geometric grid |
| Sage & terracotta | wellness/earthy, double hairline frame |
| Mocha mousse | dark espresso + cream + caramel |
| Dopamine pop | cream + electric magenta, Memphis sticker |
| Newsprint | newspaper cream + ink black + red, double rule |

**Aspect ratios:**
- `4:5` portrait (1080×1350) — recommended, most feed real estate
- `1:1` square (1080×1080)

---

## 3. Add an image to any slide

Click **Image** in a slide's control row to upload from your computer. The image is stored locally as a data URL — never sent anywhere.

After uploading, four extra controls appear:

- **Layout (6 options):** `Full` · `Top` · `Bottom` · `Left` · `Right` · `Circle`. Defaults pick automatically by slide type (cover→Full, content→Top, cta→Circle). The text region adapts to whichever you choose.
- **Focal:** cycles `Top → Center → Bottom` to reframe what part of the image is visible.
- **Dim (0–80%):** palette-aware tinted overlay. On dark palettes it darkens; on light palettes it lightens. Use it when text and image are camouflaging each other.
- **Replace / X:** swap the image or remove it.

---

## 4. Drag the text to reposition it

Click and drag anywhere on a slide preview to move the text block. A live `dx, dy` offset readout shows in the top-right of the slide while dragging. Click the **↺** reset button (appears in the slide controls when offset is non-zero) to snap back to the layout default.

---

## 5. Add or remove slides

Each slide has an **Insert below** chip row with three buttons: `+ cover`, `+ content`, `+ cta`. The trash icon removes the slide.

---

## 6. Export as PNG

- **Per-slide:** the **↓** download icon on a slide row exports just that slide.
- **All as ZIP:** the big bottom-left button bundles every slide as a ZIP. Files are named `slide-01.png`, `slide-02.png`, etc.

PNGs render at native `1080 × 1080` (square) or `1080 × 1350` (portrait). Fonts and images are awaited before each capture so output is pixel-stable.

---

## What persists, what doesn't

Stored in `localStorage` and survives a refresh:
- Palette, aspect ratio, JSON text
- Slide structure (types, content, layout choice, focal, dim level, drag offset)

**Not** stored — clears on refresh:
- Uploaded image data (kept out of localStorage to avoid the ~5MB quota)

---

## Keyboard shortcuts

- **⌘ Enter / Ctrl Enter** in the JSON box — apply
- **Esc** — close the help modal
