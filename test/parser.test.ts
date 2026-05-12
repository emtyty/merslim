import { describe, expect, it } from 'vitest';
import {
  detectDiagramType,
  parseToIR,
} from '../src/utils/diagrams/parser';
import {
  parseFlowchart,
  parsePieChart,
  parseQuadrantChart,
  parseJourney,
  parseSequence,
  parseClassDiagram,
  parseStateDiagram,
  parseMermaidERDiagram,
  parseGantt,
  parseTimeline,
  parseMindmap,
  parseArchitecture,
  parseC4,
  parseGitGraph,
} from '../src/utils/diagrams/parser';
import type {
  ClassDiagramIR,
  FlowchartIR,
  GanttDiagramIR,
  PieChartIR,
  SequenceIR,
  StateDiagramIR,
} from '../src/utils/diagrams/types';

describe('detectDiagramType', () => {
  it.each([
    ['flowchart LR\n  A --> B', 'flowchart'],
    ['graph TB\n  A --> B', 'flowchart'],
    ['sequenceDiagram\n  A->>B: hi', 'sequence'],
    ['erDiagram\n  A ||--o{ B : has', 'er'],
    ['classDiagram\n  class A', 'class'],
    ['stateDiagram-v2\n  [*] --> A', 'state'],
    ['gantt\n  title T', 'gantt'],
    ['pie title T', 'pie'],
    ['quadrantChart\n  title T', 'quadrant'],
    ['journey\n  title T', 'journey'],
    ['mindmap\n  root', 'mindmap'],
    ['gitGraph\n  commit', 'gitgraph'],
    ['timeline\n  title T', 'timeline'],
    ['C4Context\n  title T', 'c4'],
    ['C4Container\n  title T', 'c4'],
    ['architecture-beta\n  service x', 'architecture'],
  ])('detects %s as %s', async (source, expected) => {
    expect(await detectDiagramType(source)).toBe(expected);
  });

  it('skips leading directives and BOM', async () => {
    const src = '﻿%%{init: {"theme": "default"}}%%\nflowchart LR\n  A --> B';
    expect(await detectDiagramType(src)).toBe('flowchart');
  });

  it('returns null on empty source', async () => {
    expect(await detectDiagramType('   \n\n  ')).toBeNull();
  });

  it('returns "unsupported" for unknown headers', async () => {
    expect(await detectDiagramType('foobar 123\n  baz')).toBe('unsupported');
  });
});

describe('parseToIR', () => {
  it('returns ok=true with typed IR for known diagrams', async () => {
    const result = await parseToIR('flowchart LR\n  A --> B');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe('flowchart');
      expect(result.ir?.type).toBe('flowchart');
    }
  });

  it('returns ok=false on empty source', async () => {
    const result = await parseToIR('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it('returns ok=false on unrecognized header', async () => {
    const result = await parseToIR('foobar 123\n  baz');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unrecognized/i);
  });
});

describe('parseFlowchart', () => {
  it('parses direction header (TD normalizes to TB)', () => {
    expect(parseFlowchart('flowchart TD\n  A --> B').direction).toBe('TB');
    expect(parseFlowchart('flowchart LR\n  A --> B').direction).toBe('LR');
    expect(parseFlowchart('graph BT\n  A --> B').direction).toBe('BT');
  });

  it('infers nodes from edges', () => {
    const ir = parseFlowchart('flowchart LR\n  A --> B --> C');
    // Note: A --> B --> C is not chained in the popular subset; only 1 edge parsed
    expect(ir.nodes.length).toBeGreaterThanOrEqual(2);
    expect(ir.edges[0]).toMatchObject({ source: 'A', kind: 'solid' });
  });

  it('parses all shape syntaxes', () => {
    const ir = parseFlowchart(`flowchart LR
      A[Rect] --> B(Round)
      C((Circle)) --> D{Diamond}
      E[(Cylinder)] --> F[[Subroutine]]
      G>Tag] --> H`);
    const byId = Object.fromEntries(ir.nodes.map((n) => [n.id, n]));
    expect(byId.A?.kind).toBe('process');
    expect(byId.B?.kind).toBe('service');
    expect(byId.C?.kind).toBe('user');
    expect(byId.D?.kind).toBe('decision');
    expect(byId.E?.kind).toBe('database');
    expect(byId.F?.kind).toBe('queue');
    expect(byId.A?.label).toBe('Rect');
  });

  it('parses edge variants (solid, dashed, thick) with labels', () => {
    const ir = parseFlowchart(`flowchart LR
      A --> B
      C -.-> D
      E ==> F
      G -- hello --> H
      I -->|world| J`);
    const kinds = ir.edges.map((e) => e.kind);
    expect(kinds).toContain('solid');
    expect(kinds).toContain('dashed');
    expect(kinds).toContain('thick');
    const labeled = ir.edges.find((e) => e.label === 'hello');
    expect(labeled).toBeDefined();
    const pipeLabeled = ir.edges.find((e) => e.label === 'world');
    expect(pipeLabeled).toBeDefined();
  });

  it('parses subgraphs and assigns subgraph to nested nodes', () => {
    const ir = parseFlowchart(`flowchart LR
      subgraph cluster [Group A]
        A --> B
      end
      C --> A`);
    expect(ir.subgraphs).toHaveLength(1);
    expect(ir.subgraphs?.[0]).toMatchObject({ id: 'cluster', label: 'Group A' });
    const a = ir.nodes.find((n) => n.id === 'A');
    const c = ir.nodes.find((n) => n.id === 'C');
    expect(a?.subgraph).toBe('cluster');
    expect(c?.subgraph).toBeUndefined();
  });

  it('handles icon directive (Foo[Database]:::icon=logos:aws-rds)', () => {
    const ir = parseFlowchart(`flowchart LR
      Foo[Database]:::icon=logos:aws-rds`);
    const foo = ir.nodes.find((n) => n.id === 'Foo');
    expect(foo?.kind).toBe('icon');
    expect(foo?.icon).toBe('logos:aws-rds');
  });

  it('skips directives we do not model (class/style/click)', () => {
    const ir = parseFlowchart(`flowchart LR
      A --> B
      class A foo
      style A fill:#f00
      click A "url"`);
    expect(ir.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('returns an empty IR for empty input', () => {
    const ir = parseFlowchart('');
    expect(ir.nodes).toEqual([]);
    expect(ir.edges).toEqual([]);
  });
});

describe('parsePieChart', () => {
  it('parses title, slices, and showData flag', () => {
    const ir: PieChartIR = parsePieChart(`pie showData
      title My Pie
      "Slice A" : 42
      "Slice B" : 17.5`);
    expect(ir.title).toBe('My Pie');
    expect(ir.showData).toBe(true);
    expect(ir.slices).toEqual([
      { label: 'Slice A', value: 42 },
      { label: 'Slice B', value: 17.5 },
    ]);
  });

  it('ignores malformed slice lines', () => {
    const ir = parsePieChart(`pie
      "Good" : 1
      garbage line
      "Bad" : not-a-number`);
    expect(ir.slices).toEqual([{ label: 'Good', value: 1 }]);
  });
});

describe('parseQuadrantChart', () => {
  it('parses axis labels and points', () => {
    const ir = parseQuadrantChart(`quadrantChart
      title Reach vs Engagement
      x-axis Low Reach --> High Reach
      y-axis Low Engagement --> High Engagement
      quadrant-1 Stars
      Campaign: [0.8, 0.9]
      Campaign B: [0.2, 0.4]`);
    expect(ir.title).toBe('Reach vs Engagement');
    expect(ir.xAxisLabel).toEqual({ low: 'Low Reach', high: 'High Reach' });
    expect(ir.yAxisLabel).toEqual({ low: 'Low Engagement', high: 'High Engagement' });
    expect(ir.quadrantLabels?.q1).toBe('Stars');
    expect(ir.points).toEqual([
      { label: 'Campaign', x: 0.8, y: 0.9 },
      { label: 'Campaign B', x: 0.2, y: 0.4 },
    ]);
  });
});

describe('parseJourney', () => {
  it('parses sections and tasks with actors', () => {
    const ir = parseJourney(`journey
      title My Day
      section Morning
        Wake up: 5: Me
        Coffee: 4: Me, Cat
      section Work
        Code: 3: Me`);
    expect(ir.title).toBe('My Day');
    expect(ir.sections).toHaveLength(2);
    expect(ir.sections[0].tasks[1]).toEqual({
      label: 'Coffee',
      score: 4,
      actors: ['Me', 'Cat'],
    });
  });
});

describe('parseSequence', () => {
  it('parses participants and messages', () => {
    const ir: SequenceIR = parseSequence(`sequenceDiagram
      participant A as Alice
      participant B as Bob
      A->>B: Hello
      B-->>A: Hi back
      A-x B: oops`);
    expect(ir.participants.map((p) => p.id)).toEqual(['A', 'B']);
    expect(ir.participants[0].label).toBe('Alice');
    const messages = ir.steps.filter((s) => s.kind === 'message');
    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatchObject({ from: 'A', to: 'B', arrow: 'sync', label: 'Hello' });
    expect(messages[1].arrow).toBe('reply');
    expect(messages[2].arrow).toBe('cross');
  });

  it('parses notes (left/right/over)', () => {
    const ir = parseSequence(`sequenceDiagram
      Note left of A: hello
      Note over A,B: spans both`);
    const notes = ir.steps.filter((s) => s.kind === 'note');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ side: 'left', text: 'hello' });
    expect(notes[1]).toMatchObject({ side: 'over', participants: ['A', 'B'] });
  });

  it('strips activation modifiers from target', () => {
    const ir = parseSequence(`sequenceDiagram
      A->>+B: activate
      A->>-B: deactivate`);
    const msgs = ir.steps.filter((s) => s.kind === 'message');
    expect(msgs[0]).toMatchObject({ to: 'B' });
    expect(msgs[1]).toMatchObject({ to: 'B' });
  });

  it('skips control-flow keywords', () => {
    const ir = parseSequence(`sequenceDiagram
      loop forever
        A->>B: ping
      end`);
    expect(ir.steps.filter((s) => s.kind === 'message')).toHaveLength(1);
  });
});

describe('parseClassDiagram', () => {
  it('parses class blocks, members, and relations', () => {
    const ir: ClassDiagramIR = parseClassDiagram(`classDiagram
      class Animal {
        +String name
        +int age
        +makeSound() void
      }
      class Dog
      Animal <|-- Dog : extends`);
    const animal = ir.classes.find((c) => c.id === 'Animal')!;
    expect(animal.members).toHaveLength(3);
    expect(animal.members[0]).toMatchObject({
      kind: 'attribute',
      visibility: 'public',
      name: 'name',
      returnType: 'String',
    });
    expect(animal.members[2].kind).toBe('method');
    expect(ir.relations[0]).toMatchObject({
      source: 'Dog',
      target: 'Animal',
      kind: 'inheritance',
      label: 'extends',
    });
  });

  it('parses same-line class body', () => {
    const ir = parseClassDiagram(`classDiagram
      class Foo { +bar() ; +baz : int }`);
    const foo = ir.classes.find((c) => c.id === 'Foo')!;
    expect(foo.members).toHaveLength(2);
  });

  it('parses X : +member shorthand', () => {
    const ir = parseClassDiagram(`classDiagram
      Foo : +doIt()
      Foo : -secret`);
    const foo = ir.classes.find((c) => c.id === 'Foo')!;
    expect(foo.members).toHaveLength(2);
  });

  it('parses <<stereotype>> inside class body', () => {
    const ir = parseClassDiagram(`classDiagram
      class Shape {
        <<interface>>
        +area() double
      }`);
    const shape = ir.classes.find((c) => c.id === 'Shape')!;
    expect(shape.stereotype).toBe('interface');
    expect(shape.members).toHaveLength(1);
  });

  it('parses <<stereotype>> in same-line class body', () => {
    const ir = parseClassDiagram(`classDiagram
      class Foo { <<abstract>> ; +bar() }`);
    const foo = ir.classes.find((c) => c.id === 'Foo')!;
    expect(foo.stereotype).toBe('abstract');
  });

  it('parses X : <<stereotype>> shorthand', () => {
    const ir = parseClassDiagram(`classDiagram
      Animal : <<abstract>>
      Animal : +name String`);
    const a = ir.classes.find((c) => c.id === 'Animal')!;
    expect(a.stereotype).toBe('abstract');
    expect(a.members).toHaveLength(1);
  });
});

describe('parseStateDiagram', () => {
  it('parses start/end markers and labelled transitions', () => {
    const ir: StateDiagramIR = parseStateDiagram(`stateDiagram-v2
      [*] --> Idle
      Idle --> Active : start
      Active --> [*]`);
    expect(ir.states.find((s) => s.kind === 'start')).toBeDefined();
    expect(ir.states.find((s) => s.kind === 'end')).toBeDefined();
    expect(ir.transitions).toHaveLength(3);
    expect(ir.transitions[1]).toMatchObject({ source: 'Idle', target: 'Active', label: 'start' });
  });

  it('parses composite states with scoped markers', () => {
    const ir = parseStateDiagram(`stateDiagram-v2
      state Outer {
        [*] --> Inner
        Inner --> [*]
      }`);
    const outer = ir.states.find((s) => s.id === 'Outer');
    expect(outer?.kind).toBe('composite');
    const innerStart = ir.states.find((s) => s.kind === 'start' && s.parent === 'Outer');
    expect(innerStart).toBeDefined();
  });
});

describe('parseMermaidERDiagram', () => {
  it('parses tables, columns, and relations', () => {
    const ir = parseMermaidERDiagram(`erDiagram
      CUSTOMER ||--o{ ORDER : places
      CUSTOMER {
        string name
        string email PK
      }
      ORDER {
        int id PK
        int customer_id FK
      }`);
    expect(ir.schema.tables).toHaveLength(2);
    const customer = ir.schema.tables.find((t) => t.name === 'CUSTOMER')!;
    expect(customer.columns).toHaveLength(2);
    expect(customer.columns[1]).toMatchObject({ name: 'email', isPK: true });
    expect(ir.schema.relations).toHaveLength(1);
  });
});

describe('parseGantt', () => {
  it('parses tasks with explicit dates and durations', () => {
    const ir: GanttDiagramIR = parseGantt(`gantt
      title Plan
      dateFormat YYYY-MM-DD
      section Phase 1
        Task A     :a1, 2026-01-01, 30d
        Task B     :after a1, 10d
        Done thing :done, c1, 2026-02-15, 5d
        MS         :milestone, m1, 2026-03-01, 0d`);
    expect(ir.title).toBe('Plan');
    expect(ir.tasks).toHaveLength(4);
    const a = ir.tasks.find((t) => t.id === 'a1')!;
    expect(a.start.startsWith('2026-01-01')).toBe(true);
    const b = ir.tasks.find((t) => t.id === 'after-a1' || t.label === 'Task B')!;
    expect(new Date(b.end).getTime()).toBeGreaterThan(new Date(a.end).getTime());
    const done = ir.tasks.find((t) => t.status === 'done')!;
    expect(done).toBeDefined();
    const ms = ir.tasks.find((t) => t.status === 'milestone')!;
    expect(ms.start).toBe(ms.end);
  });
});

describe('parseTimeline', () => {
  it('parses sections and multi-event periods', () => {
    const ir = parseTimeline(`timeline
      title History
      section Pre-2000
        1989 : Web invented
      section 2000s
        2004 : Facebook : Gmail`);
    expect(ir.title).toBe('History');
    expect(ir.events).toHaveLength(3);
    expect(ir.events[1]).toMatchObject({ period: '2004', text: 'Facebook' });
    expect(ir.events[2]).toMatchObject({ period: '2004', text: 'Gmail' });
  });
});

describe('parseMindmap', () => {
  it('builds an indent-based tree', () => {
    const ir = parseMindmap(`mindmap
  root((Brain))
    Branch A
      Leaf 1
      Leaf 2
    Branch B`);
    expect(ir.root.label).toBe('Brain');
    expect(ir.root.shape).toBe('circle');
    expect(ir.root.children).toHaveLength(2);
    expect(ir.root.children[0].children).toHaveLength(2);
  });

  it('handles empty input gracefully', () => {
    const ir = parseMindmap('mindmap');
    expect(ir.root.label).toBe('Mindmap');
  });
});

describe('parseArchitecture', () => {
  it('parses groups, services, and edges with sides', () => {
    const ir = parseArchitecture(`architecture-beta
      group api(cloud)[API]
      service db(database)[Postgres] in api
      service web(server)[Web]
      db:L --> R:web`);
    expect(ir.nodes).toHaveLength(3);
    const db = ir.nodes.find((n) => n.id === 'db')!;
    expect(db.parent).toBe('api');
    expect(db.icon).toBe('database');
    expect(ir.edges).toHaveLength(1);
    expect(ir.edges[0]).toMatchObject({ sourceSide: 'L', targetSide: 'R' });
  });
});

describe('parseC4', () => {
  it('parses Context variant with persons, systems, and relations', () => {
    const ir = parseC4(`C4Context
      title My Context
      Person(user, "User", "End user")
      System(app, "App", "Main app")
      Rel(user, app, "Uses", "HTTPS")`);
    expect(ir.variant).toBe('context');
    expect(ir.title).toBe('My Context');
    expect(ir.elements).toHaveLength(2);
    expect(ir.elements[0]).toMatchObject({ kind: 'person', label: 'User' });
    expect(ir.relations[0]).toMatchObject({ source: 'user', target: 'app', label: 'Uses', technology: 'HTTPS' });
  });

  it('handles boundary nesting', () => {
    const ir = parseC4(`C4Container
      System_Boundary(b1, "Org") {
        System(a, "A")
        System(b, "B")
      }`);
    const a = ir.elements.find((e) => e.id === 'a');
    expect(a?.parent).toBe('b1');
  });
});

describe('parseGitGraph', () => {
  it('parses commits with id/tag/type, branches, and merges', () => {
    const ir = parseGitGraph(`gitGraph
      commit
      branch develop
      checkout develop
      commit id: "fix" type: HIGHLIGHT
      commit tag: "v1.0"
      checkout main
      merge develop tag: "release"`);
    const kinds = ir.ops.map((o) => o.kind);
    expect(kinds).toEqual(['commit', 'branch', 'checkout', 'commit', 'commit', 'checkout', 'merge']);
    expect(ir.ops[3]).toMatchObject({ kind: 'commit', id: 'fix', type: 'HIGHLIGHT' });
    expect(ir.ops[4]).toMatchObject({ kind: 'commit', tag: 'v1.0' });
    expect(ir.ops[6]).toMatchObject({ kind: 'merge', from: 'develop', tag: 'release' });
  });
});
