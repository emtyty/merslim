import { describe, expect, it } from 'vitest';
import {
  buildArchitectureSvg,
  buildC4Svg,
  buildClassSvg,
  buildErSvg,
  buildFlowchartSvg,
  buildGanttSvg,
  buildGitGraphSvg,
  buildJourneySvg,
  buildMindmapSvg,
  buildPieSvg,
  buildQuadrantSvg,
  buildStateSvg,
  buildTimelineSvg,
  svgStringToElement,
} from '../src/utils/diagrams/svgBuilders';
import { layoutFlowchart } from '../src/utils/diagrams/layout/dagreLayout';
import type {
  ArchitectureIR,
  C4IR,
  ClassDiagramIR,
  ERDiagramIR,
  FlowchartIR,
  GanttDiagramIR,
  GitGraphIR,
  JourneyIR,
  MindmapIR,
  PieChartIR,
  QuadrantChartIR,
  StateDiagramIR,
  TimelineIR,
} from '../src/utils/diagrams/types';

function expectValidSvg(svg: string) {
  expect(svg).toMatch(/^<svg\b/);
  expect(svg).toMatch(/<\/svg>\s*$/);
  expect(svg).toMatch(/viewBox=/);
  expect(svg).toMatch(/role="img"/);
  expect(svg).toMatch(/aria-label=/);
  expect(svg).toMatch(/<title>/);
  // Catch unbalanced angle brackets — quick smoke test
  const openCount = (svg.match(/</g) ?? []).length;
  const closeCount = (svg.match(/>/g) ?? []).length;
  expect(openCount).toBe(closeCount);
}

describe('buildFlowchartSvg', () => {
  const ir: FlowchartIR = {
    type: 'flowchart',
    direction: 'LR',
    nodes: [
      { id: 'a', label: 'Start', kind: 'start' },
      { id: 'b', label: 'End', kind: 'end' },
    ],
    edges: [{ source: 'a', target: 'b', label: 'go', kind: 'solid' }],
  };

  it('produces a self-contained SVG', () => {
    const { nodePositions } = layoutFlowchart(ir);
    const svg = buildFlowchartSvg(ir, nodePositions);
    expectValidSvg(svg);
    expect(svg).toContain('Start');
    expect(svg).toContain('End');
    expect(svg).toContain('go');
  });

  it('honors the dark flag (different background)', () => {
    const { nodePositions } = layoutFlowchart(ir);
    const light = buildFlowchartSvg(ir, nodePositions, { dark: false });
    const dark = buildFlowchartSvg(ir, nodePositions, { dark: true });
    expect(light).not.toBe(dark);
    expect(dark).toContain('#0f172a');
  });

  it('escapes XML in labels', () => {
    const evil: FlowchartIR = {
      type: 'flowchart',
      direction: 'LR',
      nodes: [{ id: 'a', label: '<script>&"', kind: 'plain' }],
      edges: [],
    };
    const { nodePositions } = layoutFlowchart(evil);
    const svg = buildFlowchartSvg(evil, nodePositions);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&quot;');
  });

  it('returns an empty 100x100 canvas when no positions are provided', () => {
    const svg = buildFlowchartSvg(ir, new Map());
    expectValidSvg(svg);
  });
});

describe('buildPieSvg', () => {
  it('renders slices and the title', () => {
    const ir: PieChartIR = {
      type: 'pie',
      title: 'Slices',
      slices: [
        { label: 'Alpha', value: 60 },
        { label: 'Beta', value: 40 },
      ],
    };
    const svg = buildPieSvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('Slices');
    expect(svg).toContain('Alpha');
  });
});

describe('buildQuadrantSvg', () => {
  it('renders axes, quadrants, and points', () => {
    const ir: QuadrantChartIR = {
      type: 'quadrant',
      title: 'Q',
      xAxisLabel: { low: 'Low', high: 'High' },
      yAxisLabel: { low: 'Low', high: 'High' },
      points: [{ label: 'P', x: 0.7, y: 0.7 }],
    };
    const svg = buildQuadrantSvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('P');
  });
});

describe('buildJourneySvg', () => {
  it('renders sections and tasks', () => {
    const ir: JourneyIR = {
      type: 'journey',
      title: 'My Day',
      sections: [
        { title: 'AM', tasks: [{ label: 'Wake', score: 5, actors: ['Me'] }] },
      ],
    };
    const svg = buildJourneySvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('Wake');
  });
});

describe('buildArchitectureSvg', () => {
  it('renders groups and services', () => {
    const ir: ArchitectureIR = {
      type: 'architecture',
      nodes: [
        { id: 'api', label: 'API', kind: 'group' },
        { id: 'web', label: 'Web', kind: 'service', parent: 'api' },
      ],
      edges: [],
    };
    const svg = buildArchitectureSvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('Web');
  });
});

describe('buildC4Svg', () => {
  it('renders elements and relations', () => {
    const ir: C4IR = {
      type: 'c4',
      variant: 'context',
      title: 'Ctx',
      elements: [
        { id: 'u', kind: 'person', label: 'User' },
        { id: 'a', kind: 'system', label: 'App' },
      ],
      relations: [{ source: 'u', target: 'a', label: 'Uses' }],
    };
    const svg = buildC4Svg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('User');
    expect(svg).toContain('App');
  });
});

describe('buildGanttSvg', () => {
  it('renders the title and task labels', () => {
    const ir: GanttDiagramIR = {
      type: 'gantt',
      title: 'Plan',
      tasks: [
        { id: 'a', label: 'Task A', start: '2026-01-01T00:00:00.000Z', end: '2026-01-10T00:00:00.000Z', status: 'default' },
        { id: 'b', label: 'Task B', start: '2026-01-10T00:00:00.000Z', end: '2026-01-15T00:00:00.000Z', status: 'active' },
      ],
    };
    const svg = buildGanttSvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('Task A');
  });
});

describe('buildTimelineSvg', () => {
  it('renders periods and events', () => {
    const ir: TimelineIR = {
      type: 'timeline',
      title: 'T',
      events: [
        { id: '1', period: '2024', text: 'Hello' },
        { id: '2', period: '2025', text: 'World' },
      ],
    };
    const svg = buildTimelineSvg(ir);
    expectValidSvg(svg);
    expect(svg).toContain('Hello');
    expect(svg).toContain('2025');
  });
});

describe('buildGitGraphSvg', () => {
  it('renders commits and branches', () => {
    const ir: GitGraphIR = {
      type: 'gitgraph',
      ops: [
        { kind: 'commit' },
        { kind: 'branch', name: 'feature' },
        { kind: 'checkout', name: 'feature' },
        { kind: 'commit', id: 'x', tag: 'v1' },
      ],
    };
    const svg = buildGitGraphSvg(ir);
    expectValidSvg(svg);
  });
});

describe('buildErSvg', () => {
  it('produces valid SVG given a position map', () => {
    const ir: ERDiagramIR = {
      type: 'er',
      schema: {
        inputFormat: 'unknown',
        tables: [
          { name: 'USER', columns: [{ name: 'id', type: 'int', isPK: true, isFK: false, isNullable: false, isUnique: true }] },
        ],
        relations: [],
      },
    };
    const positions = new Map([['USER', { x: 0, y: 0, width: 200, height: 80 }]]);
    const svg = buildErSvg(ir, positions);
    expectValidSvg(svg);
    expect(svg).toContain('USER');
  });
});

describe('buildClassSvg', () => {
  it('produces valid SVG with class members', () => {
    const ir: ClassDiagramIR = {
      type: 'class',
      classes: [
        {
          id: 'Animal',
          label: 'Animal',
          members: [{ kind: 'attribute', visibility: 'public', name: 'name', returnType: 'String' }],
        },
      ],
      relations: [],
    };
    const positions = new Map([['Animal', { x: 0, y: 0, width: 200, height: 100 }]]);
    const svg = buildClassSvg(ir, positions);
    expectValidSvg(svg);
    expect(svg).toContain('Animal');
    expect(svg).toContain('name');
  });
});

describe('buildStateSvg', () => {
  it('produces valid SVG given top-level positions', () => {
    const ir: StateDiagramIR = {
      type: 'state',
      states: [
        { id: '__start', label: '', kind: 'start' },
        { id: 'Idle', label: 'Idle', kind: 'state' },
      ],
      transitions: [{ source: '__start', target: 'Idle' }],
    };
    const svg = buildStateSvg(ir, {
      topLevel: new Map([
        ['__start', { x: 0, y: 0, width: 24, height: 24 }],
        ['Idle', { x: 80, y: 0, width: 96, height: 44 }],
      ]),
      children: new Map(),
    });
    expectValidSvg(svg);
    expect(svg).toContain('Idle');
  });
});

describe('buildMindmapSvg', () => {
  it('produces valid SVG given positions per id', () => {
    const ir: MindmapIR = {
      type: 'mindmap',
      root: {
        id: 'r',
        label: 'Root',
        shape: 'circle',
        children: [{ id: 'c1', label: 'Child', shape: 'rounded', children: [] }],
      },
    };
    const positions = new Map([
      ['r', { x: 0, y: 0, width: 100, height: 50, depth: 0 }],
      ['c1', { x: 200, y: 0, width: 100, height: 50, depth: 1 }],
    ]);
    const svg = buildMindmapSvg(ir, positions);
    expectValidSvg(svg);
    expect(svg).toContain('Root');
    expect(svg).toContain('Child');
  });
});

describe('svgStringToElement', () => {
  it('parses an SVG string into an SVGSVGElement', () => {
    const el = svgStringToElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>');
    expect(el).not.toBeNull();
    expect(el?.tagName.toLowerCase()).toBe('svg');
  });

  it('returns null for malformed input', () => {
    const el = svgStringToElement('not svg');
    expect(el).toBeNull();
  });
});
