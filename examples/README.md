# Examples

End-to-end usage samples.

## `playground/` — Interactive browser app (Vite + React)

A self-contained playground with all 14 diagram types preloaded, a live
source editor, dark-mode toggle, and the export toolbar wired up.

```bash
cd examples/playground
npm install
npm run dev        # start dev server with hot reload
# or
npm run build      # produce a static dist/ you can open directly
```

The build uses relative asset URLs, so `examples/playground/dist/index.html`
opens correctly from `file://` — no server required after building.

## `headless/` — Node / build-time SVG generation

A standalone script that uses the parser + builders + layout to emit
self-contained `.svg` files to disk. No React, no DOM, no browser.

```bash
cd examples/headless
npm install
npm start
```

Output goes to `examples/headless/out/` — one SVG per diagram type.

## `react/` — React component usage

`App.tsx` is a snippet (not a runnable app) showing how to mount
`<DiagramRenderer/>` and wire up `<DiagramExportToolbar/>` against the
same `RendererHandle`. Drop it into any existing React 18/19 project.
