// Drop-in React example. Not a full app — paste into any React 18/19
// project that already has Tailwind (used only by the toolbar's optional
// chrome; the diagram itself is pure SVG).
//
// What this shows:
//   - One-time `bootstrapDiagramRenderers()` registers every native renderer
//   - <DiagramRenderer source dark .../> parses + dispatches
//   - A `handleRef` exposes the live SVG so the export toolbar can serialize it
//   - `isDarkMode` / `watchDarkMode` track the `.dark` class on <html>

import { useEffect, useRef, useState } from 'react';
import {
  DiagramExportToolbar,
  DiagramRenderer,
  bootstrapDiagramRenderers,
  isDarkMode,
  watchDarkMode,
  type RendererHandle,
} from 'merslim';

bootstrapDiagramRenderers();

const SAMPLES: Record<string, string> = {
  flowchart: `flowchart LR
    A[Receive order] --> B{Payment OK?}
    B -- yes --> C[Ship]
    B -- no --> D[Cancel]`,
  sequence: `sequenceDiagram
    participant U as User
    participant A as API
    participant D as DB
    U->>A: GET /orders
    A->>D: SELECT *
    D-->>A: rows
    A-->>U: 200 OK`,
  pie: `pie showData
    title Traffic sources
    "Search" : 62.5
    "Direct" : 22.3
    "Social" : 15.2`,
  gantt: `gantt
    title Sprint
    dateFormat YYYY-MM-DD
    section Dev
      API   :a1, 2026-01-01, 5d
      UI    :after a1, 5d
    section QA
      Test  :active, 2026-01-11, 3d`,
};

export default function App() {
  const [which, setWhich] = useState<keyof typeof SAMPLES>('flowchart');
  const [dark, setDark] = useState(isDarkMode);
  const handleRef = useRef<RendererHandle | null>(null);

  useEffect(() => watchDarkMode(setDark), []);

  return (
    <div className="min-h-screen p-6">
      <div className="flex gap-2 mb-4">
        {Object.keys(SAMPLES).map((k) => (
          <button
            key={k}
            onClick={() => setWhich(k as keyof typeof SAMPLES)}
            className={`px-3 py-1 rounded border ${k === which ? 'bg-blue-500 text-white' : ''}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="group relative border rounded">
        <DiagramRenderer
          source={SAMPLES[which]}
          dark={dark}
          handleRef={handleRef}
          onError={(err) => console.error('parse failed:', err)}
        />
        <DiagramExportToolbar
          source={() => handleRef.current?.getSvgElement() ?? null}
          filenameBase={which}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
        />
      </div>
    </div>
  );
}
