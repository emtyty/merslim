import { describe, expect, it } from 'vitest';
import {
  buildArchitectureAscii,
  buildC4Ascii,
  buildClassAscii,
  buildErAscii,
  buildFlowchartAscii,
  buildGanttAscii,
  buildGitGraphAscii,
  buildJourneyAscii,
  buildMindmapAscii,
  buildPieAscii,
  buildQuadrantAscii,
  buildSequenceAscii,
  buildStateAscii,
  buildTimelineAscii,
} from '../src/utils/diagrams/asciiBuilders';
import { asciiFromIR, sourceToAscii } from '../src/utils/diagrams/asciiSource';
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
  SequenceIR,
  StateDiagramIR,
  TimelineIR,
} from '../src/utils/diagrams/types';

/** Smoke check: non-empty, finite lines, no NaN. */
function expectValidAscii(text: string) {
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toContain('NaN');
  expect(text).not.toContain('undefined');
}

describe('buildFlowchartAscii', () => {
  const ir: FlowchartIR = {
    type: 'flowchart',
    direction: 'LR',
    nodes: [
      { id: 'a', label: 'Start', kind: 'start' },
      { id: 'b', label: 'End', kind: 'end' },
    ],
    edges: [{ source: 'a', target: 'b', label: 'go' }],
  };

  it('renders boxes for every node and an arrow', () => {
    const ascii = buildFlowchartAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Start');
    expect(ascii).toContain('End');
    // box-drawing corner
    expect(ascii).toMatch(/[┌┐└┘]/);
    // some kind of arrow head
    expect(ascii).toMatch(/[▶◀▲▼]/);
  });

  it('returns empty string for an empty IR', () => {
    expect(buildFlowchartAscii({ type: 'flowchart', direction: 'TB', nodes: [], edges: [] })).toBe('');
  });
});

describe('buildStateAscii', () => {
  it('renders start/end markers and labels', () => {
    const ir: StateDiagramIR = {
      type: 'state',
      states: [
        { id: '__start', label: '', kind: 'start' },
        { id: 'Idle', label: 'Idle', kind: 'state' },
      ],
      transitions: [{ source: '__start', target: 'Idle' }],
    };
    const ascii = buildStateAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Idle');
    expect(ascii).toContain('◉');
  });
});

describe('buildSequenceAscii', () => {
  it('renders participant headers and message arrows', () => {
    const ir: SequenceIR = {
      type: 'sequence',
      participants: [
        { id: 'a', label: 'Alice' },
        { id: 'b', label: 'Bob' },
      ],
      steps: [
        { kind: 'message', from: 'a', to: 'b', arrow: 'sync', label: 'hi' },
        { kind: 'message', from: 'b', to: 'a', arrow: 'reply', label: 'ok' },
      ],
    };
    const ascii = buildSequenceAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Alice');
    expect(ascii).toContain('Bob');
    expect(ascii).toMatch(/[▶◀]/);
    // lifeline glyph
    expect(ascii).toContain('┊');
  });

  it('handles self-messages', () => {
    const ir: SequenceIR = {
      type: 'sequence',
      participants: [{ id: 'a', label: 'A' }],
      steps: [{ kind: 'message', from: 'a', to: 'a', arrow: 'sync', label: 'loop' }],
    };
    const ascii = buildSequenceAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('loop');
  });
});

describe('buildClassAscii', () => {
  it('renders class header, separator, and members', () => {
    const ir: ClassDiagramIR = {
      type: 'class',
      classes: [
        {
          id: 'Animal',
          label: 'Animal',
          members: [
            { kind: 'attribute', visibility: 'public', name: 'name', returnType: 'String' },
            { kind: 'method', visibility: 'private', name: 'eat', parameters: 'food: Food' },
          ],
        },
      ],
      relations: [],
    };
    const ascii = buildClassAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Animal');
    expect(ascii).toContain('name');
    expect(ascii).toContain('eat');
    // visibility markers
    expect(ascii).toContain('+');
    expect(ascii).toContain('-');
    // header separator
    expect(ascii).toMatch(/├.+┤/);
  });
});

describe('buildErAscii', () => {
  it('renders table boxes with column markers', () => {
    const ir: ERDiagramIR = {
      type: 'er',
      schema: {
        inputFormat: 'unknown',
        tables: [
          {
            name: 'USER',
            columns: [
              { name: 'id', type: 'int', isPK: true, isFK: false, isNullable: false, isUnique: true },
              { name: 'name', type: 'varchar', isPK: false, isFK: false, isNullable: true, isUnique: false },
            ],
          },
        ],
        relations: [],
      },
    };
    const ascii = buildErAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('USER');
    expect(ascii).toContain('id');
    expect(ascii).toContain('* id'); // PK marker
  });
});

describe('buildMindmapAscii', () => {
  it('renders a tree with branch connectors', () => {
    const ir: MindmapIR = {
      type: 'mindmap',
      root: {
        id: 'r',
        label: 'Root',
        shape: 'circle',
        children: [
          { id: 'c1', label: 'Child A', shape: 'rounded', children: [] },
          {
            id: 'c2',
            label: 'Child B',
            shape: 'square',
            children: [{ id: 'g1', label: 'Grandchild', shape: 'default', children: [] }],
          },
        ],
      },
    };
    const ascii = buildMindmapAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Root');
    expect(ascii).toContain('Child A');
    expect(ascii).toContain('Grandchild');
    expect(ascii).toContain('├─');
    expect(ascii).toContain('└─');
  });
});

describe('buildGanttAscii', () => {
  it('renders a header row, bars, and date columns', () => {
    const ir: GanttDiagramIR = {
      type: 'gantt',
      title: 'Plan',
      tasks: [
        { id: 'a', label: 'Task A', start: '2026-01-01T00:00:00.000Z', end: '2026-01-10T00:00:00.000Z', status: 'default' },
        { id: 'b', label: 'Task B', start: '2026-01-10T00:00:00.000Z', end: '2026-01-15T00:00:00.000Z', status: 'active' },
      ],
    };
    const ascii = buildGanttAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Plan');
    expect(ascii).toContain('Task A');
    expect(ascii).toContain('Task B');
    expect(ascii).toContain('2026-01-01');
    // at least one fill char
    expect(ascii).toMatch(/[░▓█▒]/);
  });
});

describe('buildJourneyAscii', () => {
  it('renders sections, tasks, and a star rating', () => {
    const ir: JourneyIR = {
      type: 'journey',
      title: 'My Day',
      sections: [{ title: 'AM', tasks: [{ label: 'Wake', score: 5, actors: ['Me'] }] }],
    };
    const ascii = buildJourneyAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('My Day');
    expect(ascii).toContain('AM');
    expect(ascii).toContain('Wake');
    expect(ascii).toContain('★');
    expect(ascii).toContain('Me');
  });
});

describe('buildPieAscii', () => {
  it('renders a horizontal bar per slice with percentage', () => {
    const ir: PieChartIR = {
      type: 'pie',
      title: 'Slices',
      slices: [
        { label: 'Alpha', value: 60 },
        { label: 'Beta', value: 40 },
      ],
    };
    const ascii = buildPieAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Slices');
    expect(ascii).toContain('Alpha');
    expect(ascii).toContain('60.0%');
    expect(ascii).toContain('40.0%');
    expect(ascii).toContain('█');
    expect(ascii).toContain('░');
  });
});

describe('buildTimelineAscii', () => {
  it('renders sections, periods, and event text', () => {
    const ir: TimelineIR = {
      type: 'timeline',
      title: 'History',
      events: [
        { id: '1', period: '1989', text: 'Web invented', section: 'Pre-2000' },
        { id: '2', period: '2003', text: 'MySpace', section: '2000s' },
      ],
    };
    const ascii = buildTimelineAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('History');
    expect(ascii).toContain('Pre-2000');
    expect(ascii).toContain('1989');
    expect(ascii).toContain('Web invented');
    expect(ascii).toContain('│');
  });
});

describe('buildQuadrantAscii', () => {
  it('renders the box, axes, and point markers', () => {
    const ir: QuadrantChartIR = {
      type: 'quadrant',
      title: 'Reach vs Engagement',
      xAxisLabel: { low: 'Low Reach', high: 'High Reach' },
      yAxisLabel: { low: 'Low E', high: 'High E' },
      quadrantLabels: { q1: 'Stars', q2: 'Niche', q3: 'Under', q4: 'Mass' },
      points: [
        { label: 'P1', x: 0.8, y: 0.8 },
        { label: 'P2', x: 0.2, y: 0.3 },
      ],
    };
    const ascii = buildQuadrantAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Reach vs Engagement');
    expect(ascii).toContain('Stars');
    expect(ascii).toContain('P1');
    expect(ascii).toContain('●');
    expect(ascii).toMatch(/[┌┐└┘]/);
  });
});

describe('buildGitGraphAscii', () => {
  it('renders commits, branches, and merges across swim-lanes', () => {
    const ir: GitGraphIR = {
      type: 'gitgraph',
      ops: [
        { kind: 'commit' },
        { kind: 'commit' },
        { kind: 'branch', name: 'feature' },
        { kind: 'checkout', name: 'feature' },
        { kind: 'commit', id: 'wip' },
        { kind: 'commit', tag: 'alpha' },
        { kind: 'checkout', name: 'main' },
        { kind: 'merge', from: 'feature', tag: 'v1.0' },
      ],
    };
    const ascii = buildGitGraphAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('main');
    expect(ascii).toContain('feature');
    expect(ascii).toContain('●');
    expect(ascii).toContain('alpha');
    expect(ascii).toContain('merge');
    expect(ascii).toContain('v1.0');
  });
});

describe('buildArchitectureAscii', () => {
  it('renders group bounding boxes around their children', () => {
    const ir: ArchitectureIR = {
      type: 'architecture',
      nodes: [
        { id: 'api', label: 'API Cluster', kind: 'group' },
        { id: 'web', label: 'Web', kind: 'service', parent: 'api' },
        { id: 'svc', label: 'API', kind: 'service', parent: 'api' },
        { id: 'db', label: 'Postgres', kind: 'service' },
      ],
      edges: [
        { source: 'web', target: 'svc' },
        { source: 'svc', target: 'db' },
      ],
    };
    const ascii = buildArchitectureAscii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('Web');
    expect(ascii).toContain('Postgres');
    expect(ascii).toContain('API Cluster');
    expect(ascii).toMatch(/[▶◀▲▼]/);
  });
});

describe('buildC4Ascii', () => {
  it('renders element kind tags and relations', () => {
    const ir: C4IR = {
      type: 'c4',
      variant: 'context',
      title: 'System Context',
      elements: [
        { id: 'u', kind: 'person', label: 'Customer', description: 'A bank customer' },
        { id: 'a', kind: 'system', label: 'Internet Banking' },
        { id: 'e', kind: 'system-external', label: 'Email', technology: 'SMTP' },
      ],
      relations: [
        { source: 'u', target: 'a', label: 'Uses', technology: 'HTTPS' },
        { source: 'a', target: 'e', label: 'Sends' },
      ],
    };
    const ascii = buildC4Ascii(ir);
    expectValidAscii(ascii);
    expect(ascii).toContain('System Context');
    expect(ascii).toContain('Customer');
    expect(ascii).toContain('Internet Banking');
    expect(ascii).toContain('«Person»');
    expect(ascii).toContain('«System (external)»');
    expect(ascii).toContain('[SMTP]');
  });
});

describe('asciiFromIR', () => {
  it('dispatches to the right builder for a flowchart IR', () => {
    const text = asciiFromIR({
      type: 'flowchart',
      direction: 'LR',
      nodes: [{ id: 'a', label: 'A', kind: 'plain' }],
      edges: [],
    });
    expect(text).not.toBeNull();
    expect(text).toContain('A');
  });

  it('handles all 14 diagram types without returning null', () => {
    // Smoke check that every type wires to a builder. Empty IRs are OK; we
    // only assert the dispatch resolves.
    expect(asciiFromIR({ type: 'timeline', events: [] })).not.toBeNull();
    expect(asciiFromIR({ type: 'quadrant', points: [] })).not.toBeNull();
    expect(asciiFromIR({ type: 'gitgraph', ops: [] })).not.toBeNull();
    expect(asciiFromIR({ type: 'architecture', nodes: [], edges: [] })).not.toBeNull();
    expect(asciiFromIR({ type: 'c4', variant: 'context', elements: [], relations: [] })).not.toBeNull();
  });
});

describe('sourceToAscii', () => {
  it('parses a flowchart source and renders ASCII', async () => {
    const text = await sourceToAscii('flowchart LR\nA --> B');
    expect(text).not.toBeNull();
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toMatch(/[▶◀]/);
  });

  it('returns null for an empty source', async () => {
    expect(await sourceToAscii('')).toBeNull();
  });

  it('returns null for unsupported syntax', async () => {
    expect(await sourceToAscii('this is not a diagram')).toBeNull();
  });
});
