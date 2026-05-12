import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DiagramExportToolbar,
  DiagramRenderer,
  bootstrapDiagramRenderers,
  isDarkMode,
  watchDarkMode,
  type RendererHandle,
} from 'merslim';
import { SAMPLES, type SampleKey } from './samples';

bootstrapDiagramRenderers();

export default function App() {
  const [active, setActive] = useState<SampleKey>('flowchart');
  const [source, setSource] = useState<string>(SAMPLES.flowchart.source);
  const [dark, setDark] = useState<boolean>(isDarkMode);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<RendererHandle | null>(null);

  useEffect(() => watchDarkMode(setDark), []);

  // Toggle the global .dark class so the playground's chrome follows along.
  function toggleDark() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
  }

  function loadSample(key: SampleKey) {
    setActive(key);
    setSource(SAMPLES[key].source);
    setError(null);
  }

  const sampleKeys = useMemo(() => Object.keys(SAMPLES) as SampleKey[], []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <header>
          <h1>merslim</h1>
          <button className="toggle" onClick={toggleDark}>
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
        </header>

        <nav>
          {sampleKeys.map((k) => (
            <button
              key={k}
              className={`nav-btn ${k === active ? 'active' : ''}`}
              onClick={() => loadSample(k)}
            >
              {SAMPLES[k].label}
            </button>
          ))}
        </nav>

        <label className="editor-label">Source</label>
        <textarea
          className="editor"
          value={source}
          spellCheck={false}
          onChange={(e) => {
            setSource(e.target.value);
            setError(null);
          }}
        />

        {error && <div className="error">{error}</div>}

        <footer>
          Hover the diagram to reveal the export toolbar (Copy SVG / Copy PNG /
          Download SVG / Download PNG).
        </footer>
      </aside>

      <main className="canvas">
        <div className="canvas-inner group">
          <DiagramRenderer
            key={`${active}-${dark}`}
            source={source}
            dark={dark}
            handleRef={handleRef}
            onError={setError}
          />
          <DiagramExportToolbar
            source={() => handleRef.current?.getSvgElement() ?? null}
            filenameBase={active}
            className="toolbar"
            onError={(err) => setError(err.message)}
          />
        </div>
      </main>
    </div>
  );
}
