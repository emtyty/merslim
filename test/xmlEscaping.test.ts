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
} from '../src/utils/diagrams/svgBuilders';
import {
  classToSvg,
  erToSvg,
  flowchartToSvg,
} from '../src/utils/diagrams/convenience';
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

// Adversarial string — if any of this lands unescaped in output we have an
// SVG-injection bug. We check for the literal `<script>` and unbalanced
// `</svg>` sequences after stripping the legitimate closing tag.
const PAYLOAD = `</svg><script>alert("XSS")</script>&"'<>`;

function assertNoInjection(svg: string) {
  // The output must end with exactly one </svg>. Strip it and assert the
  // rest contains no `<script>` or `</svg>` substring.
  const closing = svg.lastIndexOf('</svg>');
  expect(closing).toBeGreaterThan(0);
  const body = svg.slice(0, closing);
  expect(body).not.toMatch(/<script/i);
  expect(body).not.toMatch(/<\/svg>/i);
  // The raw payload itself should never appear verbatim.
  expect(svg).not.toContain('<script>');
  expect(svg).not.toContain(PAYLOAD);
}

describe('XML escaping — fuzz every IR string field', () => {
  it('flowchart: node labels, edge labels, subgraph labels', () => {
    const ir: FlowchartIR = {
      type: 'flowchart',
      direction: 'LR',
      nodes: [
        { id: 'a', label: PAYLOAD, kind: 'plain' },
        { id: 'b', label: PAYLOAD, kind: 'decision' },
      ],
      edges: [{ source: 'a', target: 'b', label: PAYLOAD, kind: 'solid' }],
      subgraphs: [{ id: 's', label: PAYLOAD }],
    };
    assertNoInjection(flowchartToSvg(ir));
  });

  it('pie: title and slice labels', () => {
    const ir: PieChartIR = {
      type: 'pie',
      title: PAYLOAD,
      slices: [
        { label: PAYLOAD, value: 1 },
        { label: PAYLOAD, value: 2 },
      ],
    };
    assertNoInjection(buildPieSvg(ir));
  });

  it('quadrant: title, axis labels, quadrant labels, point labels', () => {
    const ir: QuadrantChartIR = {
      type: 'quadrant',
      title: PAYLOAD,
      xAxisLabel: { low: PAYLOAD, high: PAYLOAD },
      yAxisLabel: { low: PAYLOAD, high: PAYLOAD },
      quadrantLabels: { q1: PAYLOAD, q2: PAYLOAD, q3: PAYLOAD, q4: PAYLOAD },
      points: [{ label: PAYLOAD, x: 0.5, y: 0.5 }],
    };
    assertNoInjection(buildQuadrantSvg(ir));
  });

  it('journey: title, section titles, task labels, actors', () => {
    const ir: JourneyIR = {
      type: 'journey',
      title: PAYLOAD,
      sections: [
        {
          title: PAYLOAD,
          tasks: [{ label: PAYLOAD, score: 3, actors: [PAYLOAD, PAYLOAD] }],
        },
      ],
    };
    assertNoInjection(buildJourneySvg(ir));
  });

  it('gantt: title, task labels, sections', () => {
    const ir: GanttDiagramIR = {
      type: 'gantt',
      title: PAYLOAD,
      tasks: [
        {
          id: 't',
          label: PAYLOAD,
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-10T00:00:00.000Z',
          status: 'default',
          section: PAYLOAD,
        },
      ],
    };
    assertNoInjection(buildGanttSvg(ir));
  });

  it('timeline: title, period, event text, section', () => {
    const ir: TimelineIR = {
      type: 'timeline',
      title: PAYLOAD,
      events: [{ id: '1', period: PAYLOAD, text: PAYLOAD, section: PAYLOAD }],
    };
    assertNoInjection(buildTimelineSvg(ir));
  });

  it('class: class labels, member names, member types, stereotypes, relation labels', () => {
    const ir: ClassDiagramIR = {
      type: 'class',
      classes: [
        {
          id: 'A',
          label: PAYLOAD,
          stereotype: PAYLOAD,
          members: [
            { kind: 'attribute', visibility: 'public', name: PAYLOAD, returnType: PAYLOAD },
            { kind: 'method', visibility: 'private', name: PAYLOAD, parameters: PAYLOAD, returnType: PAYLOAD },
          ],
        },
        { id: 'B', label: PAYLOAD, members: [] },
      ],
      relations: [{ source: 'A', target: 'B', kind: 'inheritance', label: PAYLOAD }],
    };
    assertNoInjection(classToSvg(ir));
  });

  it('state: state labels, transition labels', () => {
    const ir: StateDiagramIR = {
      type: 'state',
      states: [
        { id: 's1', label: PAYLOAD, kind: 'state' },
        { id: 's2', label: PAYLOAD, kind: 'state' },
      ],
      transitions: [{ source: 's1', target: 's2', label: PAYLOAD }],
    };
    assertNoInjection(
      buildStateSvg(ir, {
        topLevel: new Map([
          ['s1', { x: 0, y: 0, width: 100, height: 44 }],
          ['s2', { x: 200, y: 0, width: 100, height: 44 }],
        ]),
        children: new Map(),
      }),
    );
  });

  it('er: table names, column names, column types', () => {
    const ir: ERDiagramIR = {
      type: 'er',
      schema: {
        inputFormat: 'unknown',
        tables: [
          {
            name: PAYLOAD,
            columns: [
              {
                name: PAYLOAD,
                type: PAYLOAD,
                isPK: true,
                isFK: false,
                isNullable: false,
                isUnique: false,
              },
            ],
          },
        ],
        relations: [],
      },
    };
    assertNoInjection(erToSvg(ir));
  });

  it('mindmap: node labels at every depth', () => {
    const ir: MindmapIR = {
      type: 'mindmap',
      root: {
        id: 'r',
        label: PAYLOAD,
        shape: 'circle',
        children: [
          {
            id: 'c1',
            label: PAYLOAD,
            shape: 'rounded',
            children: [{ id: 'g1', label: PAYLOAD, shape: 'square', children: [] }],
          },
        ],
      },
    };
    assertNoInjection(
      buildMindmapSvg(
        ir,
        new Map([
          ['r', { x: 0, y: 0, width: 100, height: 50, depth: 0 }],
          ['c1', { x: 200, y: 0, width: 100, height: 50, depth: 1 }],
          ['g1', { x: 400, y: 0, width: 100, height: 50, depth: 2 }],
        ]),
      ),
    );
  });

  it('architecture: node labels, edge labels', () => {
    const ir: ArchitectureIR = {
      type: 'architecture',
      nodes: [
        { id: 'a', label: PAYLOAD, kind: 'group' },
        { id: 'b', label: PAYLOAD, kind: 'service', parent: 'a' },
      ],
      edges: [{ source: 'a', target: 'b', label: PAYLOAD }],
    };
    assertNoInjection(buildArchitectureSvg(ir));
  });

  it('c4: title, element label/technology/description, relation label/technology', () => {
    const ir: C4IR = {
      type: 'c4',
      variant: 'context',
      title: PAYLOAD,
      elements: [
        { id: 'a', kind: 'person', label: PAYLOAD, technology: PAYLOAD, description: PAYLOAD },
        { id: 'b', kind: 'system', label: PAYLOAD, technology: PAYLOAD, description: PAYLOAD },
      ],
      relations: [{ source: 'a', target: 'b', label: PAYLOAD, technology: PAYLOAD }],
    };
    assertNoInjection(buildC4Svg(ir));
  });

  it('gitgraph: title, commit id, commit tag, branch name', () => {
    const ir: GitGraphIR = {
      type: 'gitgraph',
      title: PAYLOAD,
      ops: [
        { kind: 'commit', id: PAYLOAD, tag: PAYLOAD },
        { kind: 'branch', name: PAYLOAD },
        { kind: 'checkout', name: PAYLOAD },
        { kind: 'commit', id: PAYLOAD },
        { kind: 'merge', from: PAYLOAD, tag: PAYLOAD },
      ],
    };
    assertNoInjection(buildGitGraphSvg(ir));
  });

  // Sanity: a clean diagram should not trip our injection detector.
  it('clean output passes the injection detector', () => {
    const ir: FlowchartIR = {
      type: 'flowchart',
      direction: 'LR',
      nodes: [{ id: 'a', label: 'Hello', kind: 'plain' }],
      edges: [],
    };
    assertNoInjection(flowchartToSvg(ir));
  });
});

// Also verify the position-taking builders directly (without convenience layer).
describe('XML escaping — position-taking builders', () => {
  it('buildFlowchartSvg', () => {
    const ir: FlowchartIR = {
      type: 'flowchart',
      direction: 'LR',
      nodes: [{ id: 'a', label: PAYLOAD, kind: 'plain' }],
      edges: [],
    };
    assertNoInjection(
      buildFlowchartSvg(ir, new Map([['a', { x: 0, y: 0 }]])),
    );
  });

  it('buildClassSvg', () => {
    const ir: ClassDiagramIR = {
      type: 'class',
      classes: [
        {
          id: 'A',
          label: PAYLOAD,
          members: [{ kind: 'attribute', name: PAYLOAD, returnType: PAYLOAD }],
        },
      ],
      relations: [],
    };
    assertNoInjection(
      buildClassSvg(ir, new Map([['A', { x: 0, y: 0, width: 200, height: 80 }]])),
    );
  });

  it('buildErSvg', () => {
    const ir: ERDiagramIR = {
      type: 'er',
      schema: {
        inputFormat: 'unknown',
        tables: [
          {
            name: PAYLOAD,
            columns: [
              { name: PAYLOAD, type: PAYLOAD, isPK: false, isFK: false, isNullable: true, isUnique: false },
            ],
          },
        ],
        relations: [],
      },
    };
    assertNoInjection(
      buildErSvg(ir, new Map([[PAYLOAD, { x: 0, y: 0, width: 240, height: 80 }]])),
    );
  });
});
