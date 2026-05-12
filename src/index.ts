// Public API for `merslim`.
//
// Three entry points by use case:
//
// 1. Drop-in React component — give it a mermaid-style source string and
//    it renders the diagram natively:
//      <DiagramRenderer source={mermaidSource} dark={isDark} />
//
// 2. Programmatic IR → SVG (headless / SSR / build-time):
//      const ir = await parseToIR(source);
//      const svgString = buildFlowchartSvg(ir.ir as FlowchartIR);
//
// 3. Renderer registry — extend with custom diagram types:
//      register({ type: 'myCustom', loader: () => import('./MyRenderer') });
//
// Call `bootstrapDiagramRenderers()` once at app startup before mounting
// any <DiagramRenderer/> instance. It lazily registers every built-in
// renderer; each one's code is only fetched the first time a diagram of
// that type appears.

// ── Components ───────────────────────────────────────────────────────────
export { default as DiagramRenderer } from './components/diagrams/DiagramRenderer';
export { default as DiagramExportToolbar } from './components/diagrams/DiagramExportToolbar';

// Individual renderers, exported so callers who already have an IR can
// skip the source-string parsing step entirely. Static imports here mean
// the consumer's bundler will tree-shake renderers they don't reference.
export { default as FlowchartRenderer } from './components/diagrams/FlowchartRenderer';
export { default as ERRenderer } from './components/diagrams/ERRenderer';
export { default as PieRenderer } from './components/diagrams/PieRenderer';
export { default as QuadrantRenderer } from './components/diagrams/QuadrantRenderer';
export { default as JourneyRenderer } from './components/diagrams/JourneyRenderer';
export { default as SequenceRenderer } from './components/diagrams/SequenceRenderer';
export { default as ClassRenderer } from './components/diagrams/ClassRenderer';
export { default as StateRenderer } from './components/diagrams/StateRenderer';
export { default as GanttRenderer } from './components/diagrams/GanttRenderer';
export { default as TimelineRenderer } from './components/diagrams/TimelineRenderer';
export { default as MindmapRenderer } from './components/diagrams/MindmapRenderer';
export { default as ArchitectureRenderer } from './components/diagrams/ArchitectureRenderer';
export { default as C4Renderer } from './components/diagrams/C4Renderer';
export { default as GitGraphRenderer } from './components/diagrams/GitGraphRenderer';

// ── Registry + bootstrap ─────────────────────────────────────────────────
export { bootstrapDiagramRenderers } from './components/diagrams/bootstrap';
export {
  register,
  getRenderer,
  hasRenderer,
  _resetRegistry,
} from './utils/diagrams/registry';
export type {
  RendererHandle,
  RendererProps,
  RendererEntry,
  IRForType,
} from './utils/diagrams/registry';

// ── Parser ───────────────────────────────────────────────────────────────
export { parseToIR, detectDiagramType } from './utils/diagrams/parser';

// ── SVG builders (use directly for headless / SSR) ───────────────────────
//
// Two flavors:
//   - One-call convenience builders for graph diagrams that need layout
//     (`flowchartToSvg`, `classToSvg`, `erToSvg`). Internally run dagre.
//   - Position-taking power-user builders (`buildFlowchartSvg(ir, positions)`
//     etc.) for callers who want to compute layout themselves.
//
// Chart-shaped builders (pie, quadrant, journey, gantt, timeline, c4,
// architecture, gitgraph) don't need layout — they're one-call already.
export {
  flowchartToSvg,
  classToSvg,
  erToSvg,
} from './utils/diagrams/convenience';
export {
  buildFlowchartSvg,
  buildErSvg,
  buildPieSvg,
  buildQuadrantSvg,
  buildJourneySvg,
  buildClassSvg,
  buildStateSvg,
  buildGanttSvg,
  buildTimelineSvg,
  buildMindmapSvg,
  buildArchitectureSvg,
  buildC4Svg,
  buildGitGraphSvg,
  svgStringToElement,
} from './utils/diagrams/svgBuilders';
export type { StateBuildPositions } from './utils/diagrams/svgBuilders';

// ── Export pipeline (clipboard / download / serialize) ──────────────────
export {
  toSvgString,
  svgToPngBlob,
  getSvgDimensions,
  downloadSvg,
  downloadPng,
  copySvgToClipboard,
  copyPngToClipboard,
  INLINEABLE_STYLE_PROPS,
} from './utils/diagrams/export';
export type {
  SvgSource,
  PngOptions,
  SvgStringOptions,
} from './utils/diagrams/export';

// ── Layout primitive ─────────────────────────────────────────────────────
export { layoutFlowchart } from './utils/diagrams/layout/dagreLayout';
export type { NodeSize } from './utils/diagrams/layout/dagreLayout';

// ── Dark-mode helpers ────────────────────────────────────────────────────
export { isDarkMode, watchDarkMode } from './components/diagrams/darkMode';

// ── Theme tokens ─────────────────────────────────────────────────────────
export { getDiagramTheme } from './components/diagrams/shared/theme';

// ── All IR / domain types ────────────────────────────────────────────────
export type * from './utils/diagrams/types';
