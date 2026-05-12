# merslim

A **slimmer mermaid** — SVG-first diagram renderer for mermaid-style syntax. 14 native diagram types, zero mermaid runtime dependency.

| | |
|---|---|
| Bundle | ~160 KB minified ESM (vs. mermaid's ~3 MB lazy-loaded / ~7 MB full) |
| Runtime deps | `dagre` only |
| Peer deps | `react ^18 \|\| ^19`, `react-dom ^18 \|\| ^19` |
| Mermaid | **none** — parsers and renderers are native |
| Output | Standalone SVG (computed styles inlined for fidelity) |
| License | MIT |

## Why

Mermaid is great, but it's heavy, opaque, and not easy to extend. `merslim` re-implements the popular subset of mermaid syntax with:

- A small, typed intermediate representation (IR) you can build programmatically — no need to round-trip through text if you have structured data.
- A pluggable renderer registry. Diagrams are React components; lazy-loaded by type so you only pay for what you use.
- A serializer that walks the live DOM, inlines `getComputedStyle()` values onto a clone, and emits a self-contained SVG that opens identically in browsers, Inkscape, and Office.
- No vendor lock-in to a single visual style — every renderer is ~150–400 lines of plain React/SVG, easy to fork.

## Supported diagram types

`flowchart` · `sequenceDiagram` · `erDiagram` · `classDiagram` · `stateDiagram-v2` · `gantt` · `timeline` · `pie` · `quadrantChart` · `journey` · `mindmap` · `architecture-beta` · `C4Context` (Container / Component / Deployment) · `gitGraph`

## Install

```bash
npm install merslim
```

## Quick start

```tsx
import { DiagramRenderer, bootstrapDiagramRenderers } from 'merslim';

bootstrapDiagramRenderers(); // call once at app startup

const source = `
flowchart LR
  A[Edit] --> B{Render}
  B --> C[Export]
`;

export function App() {
  return <DiagramRenderer source={source} />;
}
```

## With the export toolbar

```tsx
import { useRef } from 'react';
import {
  DiagramRenderer,
  DiagramExportToolbar,
  type RendererHandle,
} from 'merslim';

export function MyDiagram({ source }: { source: string }) {
  const handleRef = useRef<RendererHandle | null>(null);

  return (
    <div className="group relative">
      <DiagramRenderer source={source} handleRef={handleRef} />
      <DiagramExportToolbar
        source={() => handleRef.current?.getSvgElement() ?? null}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}
```

The toolbar gives you four buttons — copy SVG, copy PNG, download SVG, download PNG — all routed through the same standalone-SVG serializer.

## Headless / SSR

If you only need an SVG string (e.g. to generate diagrams at build time for an MDX blog), skip the React component entirely:

```ts
import { parseToIR, flowchartToSvg, type FlowchartIR } from 'merslim';

const result = await parseToIR(`
flowchart LR
  A --> B
`);

if (result.ok && result.type === 'flowchart') {
  const svg = flowchartToSvg(result.ir as FlowchartIR, { dark: false });
  // write to disk, embed, ship to a CDN...
}
```

> **Two builder flavors.** For each graph-shaped diagram there's a one-call
> convenience builder (`flowchartToSvg`, `classToSvg`, `erToSvg`) that runs
> layout internally, and a position-taking power-user builder
> (`buildFlowchartSvg(ir, positions, opts)`) for callers who want custom
> layout. Chart-shaped diagrams (pie, quadrant, journey, gantt, timeline,
> c4, architecture, gitgraph) are one-call already.
> See [`examples/headless/generate.ts`](./examples/headless/generate.ts) for
> the full pattern.

## Build your own IR

The parser is one way to produce an IR; you can produce one any way you like. If you have structured data (a list of orders, a service topology, a customer journey) you can skip mermaid syntax entirely:

```ts
import { flowchartToSvg, type FlowchartIR } from 'merslim';

const ir: FlowchartIR = {
  type: 'flowchart',
  direction: 'LR',
  nodes: [
    { id: 'a', label: 'Order received', kind: 'start' },
    { id: 'b', label: 'Validate payment', kind: 'decision' },
    { id: 'c', label: 'Ship', kind: 'end' },
  ],
  edges: [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c', label: 'paid' },
  ],
};

const svg = flowchartToSvg(ir, { dark: false });
```

## Selective renderer registration

`bootstrapDiagramRenderers()` is a convenience that registers all 14 native
renderers (lazy-loaded, so unused ones stay out of your initial bundle).
If you only need a subset and want to skip even the lazy chunks, call
`register()` directly:

```ts
import { register, DiagramRenderer } from 'merslim';

register({
  type: 'flowchart',
  loader: () =>
    import('merslim').then((m) => ({ default: m.FlowchartRenderer })),
});
// Now <DiagramRenderer/> only knows about flowcharts. Any other diagram type
// surfaces a "no renderer registered" error.
```

If you already have an IR and want to skip the source-string parser entirely,
the 14 renderers are also exported directly and can be mounted as standalone
components — `<FlowchartRenderer ir={ir} dark={dark}/>`, `<PieRenderer/>`,
`<SequenceRenderer/>`, etc.

## Dark mode

Pass a `dark` prop to `<DiagramRenderer/>`, or use the helper to track a `.dark` class on `<html>`:

```ts
import { isDarkMode, watchDarkMode } from 'merslim';

const [dark, setDark] = useState(isDarkMode);
useEffect(() => watchDarkMode(setDark), []);
```

## API surface

### Components

| Export | Purpose |
|---|---|
| `<DiagramRenderer source dark handleRef onError/>` | Parses a source string, dispatches to the matching renderer, exposes a `RendererHandle` ref. |
| `<DiagramExportToolbar source filenameBase pngScale .../>` | 4-button copy/download toolbar. Accepts any `SvgSource`. |
| `<FlowchartRenderer/>` `<SequenceRenderer/>` `<ERRenderer/>` `<ClassRenderer/>` `<StateRenderer/>` `<GanttRenderer/>` `<TimelineRenderer/>` `<PieRenderer/>` `<QuadrantRenderer/>` `<JourneyRenderer/>` `<MindmapRenderer/>` `<ArchitectureRenderer/>` `<C4Renderer/>` `<GitGraphRenderer/>` | Direct-mount renderer per diagram type. Same `RendererProps<T>` signature: `{ ir, dark, handleRef }`. Use these when you already have an IR. |

### Parser / IR

| Export | Type | Purpose |
|---|---|---|
| `parseToIR(source)` | `(string) => Promise<ParseResult>` | Mermaid syntax → typed IR. On success, narrows to `{ ok: true, type: DiagramType, ir: DiagramIR }`. |
| `detectDiagramType(source)` | `(string) => Promise<RecognizedDiagramType \| null>` | Lightweight first-line check. Returns `null` for empty input, `'unsupported'` for unrecognized headers. |

### Builders (headless)

| Convenience (auto-layout) | Power-user (explicit positions) |
|---|---|
| `flowchartToSvg(ir, opts)` | `buildFlowchartSvg(ir, positions, opts)` |
| `classToSvg(ir, opts)` | `buildClassSvg(ir, positions, opts)` |
| `erToSvg(ir, opts)` | `buildErSvg(ir, positions, opts)` |
| — | `buildStateSvg(ir, { topLevel, children }, opts)` |
| — | `buildMindmapSvg(ir, positions, opts)` |

Plus the chart-shaped diagrams which never need positions:
`buildPieSvg`, `buildQuadrantSvg`, `buildJourneySvg`, `buildGanttSvg`,
`buildTimelineSvg`, `buildArchitectureSvg`, `buildC4Svg`, `buildGitGraphSvg`.

All builders take a final `{ dark, padding }` options object and return a
self-contained SVG string with `role="img"` and an `aria-label`.

### Export pipeline

| Export | Purpose |
|---|---|
| `toSvgString(source, opts)` | Serialize any `SvgSource` to a standalone SVG string. |
| `svgToPngBlob(svg, opts)` | Rasterize an SVG string to a PNG `Blob`. |
| `downloadSvg / downloadPng` | Trigger a file download. |
| `copySvgToClipboard / copyPngToClipboard` | Write SVG (text) / PNG (image) to the clipboard. |
| `getSvgDimensions(svg)` | Best-effort intrinsic size from `viewBox` / attrs. |

### Registry

| Export | Purpose |
|---|---|
| `register({ type, loader })` | Register a renderer for a diagram type. |
| `bootstrapDiagramRenderers()` | One-shot registration of all built-in renderers. |
| `getRenderer(type) / hasRenderer(type)` | Introspect the registry. |

## Examples

- [`examples/playground/`](./examples/playground/) — Vite + React playground
  with all 14 diagram types, a live source editor, dark-mode toggle, and
  the export toolbar. `npm install && npm run dev` (or `npm run build` for a
  static `dist/` that opens directly from `file://`).
- [`examples/headless/`](./examples/headless/) — Node script that generates
  one self-contained SVG per diagram type. `npm install && npm start`.
- [`examples/react/App.tsx`](./examples/react/App.tsx) — Minimal React
  snippet showing the same component wiring without the playground chrome.

## Development

```bash
npm install
npm run type-check   # tsc --noEmit
npm test             # vitest run
npm run build        # tsup → dist/ (ESM + CJS + .d.ts)
```

## Notes & limitations

- The built-in renderers use a handful of Tailwind utility classes for surrounding chrome (loading / error states). The diagrams themselves are pure SVG and render correctly without Tailwind; only the wrapper container styling looks bare. PRs to make this opt-out are welcome.
- `parseToIR` is asynchronous because some builders (gantt, timeline) defer parsing work. Today the body is synchronous but the signature is stable.

## Mermaid compatibility

merslim parses a curated subset of mermaid syntax. The full contract is enforced by [`test/compatCorpus.ts`](./test/compatCorpus.ts) — every entry there is a parse-time test that runs in CI.

**Known gaps** (parse but produce a partial IR, or fail outright):

| Diagram | Gap |
|---|---|
| flowchart | Multi-target shorthand `A & B --> C & D` |
| flowchart | Trapezoid shape `[/Foo\]` (falls back to rect) |
| flowchart | `<br/>` in labels treated as literal text, not a line break |
| sequence | `loop`/`alt`/`opt`/`par` blocks parse but render flat (no visual nesting) |
| sequence | `autonumber` keyword accepted but not honored |
| sequence | Bidirectional `<<->>` arrow |
| class | Generics `class Container~T~` |
| class | Cardinality labels `"1" --> "*"` |
| class | `namespace { ... }` blocks |
| state | Parallel/concurrent regions (`--` separator) |
| state | `<<choice>>`/`<<fork>>`/`<<join>>` pseudo-states |
| gantt | `excludes`/`todayMarker`/`tickInterval` accepted but not modeled |

If you hit a case not listed here, [add it to the corpus as a `known-gap` entry](./test/compatCorpus.ts) — that converts an issue into an executable spec.

## License

MIT. See [LICENSE](./LICENSE).
