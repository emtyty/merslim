// Smoke test for every React renderer module.
//
// We don't actually mount these (that would need a full DOM + ReactFlow +
// dagre, which the unit-test layer shouldn't carry). What we DO check is
// that every renderer module imports cleanly and exports a callable React
// component as its `default` — catching import-time crashes, circular-
// dependency surprises, and accidental named-export mismatches across the
// 14 renderers.
//
// Live-render verification lives in the playground + Playwright (manual).

import { describe, expect, it } from 'vitest';

const RENDERER_MODULES = [
  () => import('../src/components/diagrams/FlowchartRenderer'),
  () => import('../src/components/diagrams/ERRenderer'),
  () => import('../src/components/diagrams/PieRenderer'),
  () => import('../src/components/diagrams/QuadrantRenderer'),
  () => import('../src/components/diagrams/JourneyRenderer'),
  () => import('../src/components/diagrams/SequenceRenderer'),
  () => import('../src/components/diagrams/ClassRenderer'),
  () => import('../src/components/diagrams/StateRenderer'),
  () => import('../src/components/diagrams/GanttRenderer'),
  () => import('../src/components/diagrams/TimelineRenderer'),
  () => import('../src/components/diagrams/MindmapRenderer'),
  () => import('../src/components/diagrams/ArchitectureRenderer'),
  () => import('../src/components/diagrams/C4Renderer'),
  () => import('../src/components/diagrams/GitGraphRenderer'),
] as const;

describe('renderer modules', () => {
  it.each(RENDERER_MODULES.map((load, i) => [i, load]))(
    'module #%i loads and default-exports a component',
    async (_i, load) => {
      const mod = await (load as () => Promise<{ default: unknown }>)();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    },
  );
});

describe('bootstrap', () => {
  it('idempotent bootstrapDiagramRenderers registers all 14 types', async () => {
    const { bootstrapDiagramRenderers } = await import(
      '../src/components/diagrams/bootstrap'
    );
    const { _resetRegistry, hasRenderer } = await import(
      '../src/utils/diagrams/registry'
    );
    _resetRegistry();
    bootstrapDiagramRenderers();
    bootstrapDiagramRenderers(); // second call should be a no-op
    for (const t of [
      'flowchart', 'er', 'pie', 'quadrant', 'journey', 'sequence',
      'class', 'state', 'gantt', 'timeline', 'mindmap', 'architecture',
      'c4', 'gitgraph',
    ] as const) {
      expect(hasRenderer(t)).toBe(true);
    }
  });
});

describe('top-level package exports', () => {
  it('re-exports every native renderer', async () => {
    const pkg = await import('../src/index');
    const expectedRenderers = [
      'DiagramRenderer',
      'DiagramExportToolbar',
      'FlowchartRenderer',
      'ERRenderer',
      'PieRenderer',
      'QuadrantRenderer',
      'JourneyRenderer',
      'SequenceRenderer',
      'ClassRenderer',
      'StateRenderer',
      'GanttRenderer',
      'TimelineRenderer',
      'MindmapRenderer',
      'ArchitectureRenderer',
      'C4Renderer',
      'GitGraphRenderer',
    ];
    for (const name of expectedRenderers) {
      expect((pkg as Record<string, unknown>)[name]).toBeDefined();
      expect(typeof (pkg as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('re-exports the convenience and power-user builders', async () => {
    const pkg = await import('../src/index');
    for (const name of [
      'flowchartToSvg',
      'classToSvg',
      'erToSvg',
      'buildFlowchartSvg',
      'buildPieSvg',
      'parseToIR',
      'detectDiagramType',
      'register',
      'bootstrapDiagramRenderers',
      'toSvgString',
      'svgToPngBlob',
    ]) {
      expect((pkg as Record<string, unknown>)[name]).toBeDefined();
      expect(typeof (pkg as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
