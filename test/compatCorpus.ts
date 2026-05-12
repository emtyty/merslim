// Hand-curated corpus of mermaid edge cases.
//
// Each entry documents one piece of upstream mermaid syntax that merslim
// should EITHER handle ("parses" / "parses-partial") or be honest about
// not handling yet ("known-gap"). The test that consumes this file
// enforces all three categories, so:
//
//   - "parses" entries breaking the build = regression
//   - "known-gap" entries that suddenly start working = good news, flip them
//   - new mermaid feature you want to support = add it here first, code second
//
// In other words: this is the contract. It replaces the vague "popular
// subset" hand-wave with a concrete, testable list.

export type CompatExpectation =
  | 'parses' // parseToIR returns ok=true with a populated IR (≥1 node/element/task/etc.)
  | 'parses-empty' // parseToIR returns ok=true but the IR may legitimately be empty (e.g. only directives)
  | 'known-gap'; // parseToIR may fail or produce a degenerate IR; we accept either; test asserts no crash

export interface CompatEntry {
  name: string;
  /** Diagram type this entry exercises. */
  type:
    | 'flowchart' | 'sequence' | 'er' | 'class' | 'state'
    | 'gantt' | 'timeline' | 'pie' | 'quadrant' | 'journey'
    | 'mindmap' | 'architecture' | 'c4' | 'gitgraph';
  source: string;
  expect: CompatExpectation;
  /** Free-text reason — shown in the test output for known-gap entries. */
  note?: string;
}

export const COMPAT_CORPUS: CompatEntry[] = [
  // ── Flowchart ──────────────────────────────────────────────────────────
  {
    name: 'flowchart: all shape syntaxes',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A[Rect] --> B(Round)
      C((Circle)) --> D{Diamond}
      E[(Cylinder)] --> F[[Subroutine]]
      G>Tag] --> H`,
  },
  {
    name: 'flowchart: graph keyword alias',
    type: 'flowchart',
    expect: 'parses',
    source: `graph TD
      A --> B`,
  },
  {
    name: 'flowchart: chained edges A --> B --> C',
    type: 'flowchart',
    expect: 'parses-empty',
    note: 'Chained edges parse as a single edge to the first node only; downstream nodes are dropped',
    source: `flowchart LR
      A --> B --> C`,
  },
  {
    name: 'flowchart: self-loop',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A --> A`,
  },
  {
    name: 'flowchart: thick edge with label',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A == hello ==> B`,
  },
  {
    name: 'flowchart: pipe-syntax label',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A -->|hi| B`,
  },
  {
    name: 'flowchart: dotted edge with label',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A -. note .-> B`,
  },
  {
    name: 'flowchart: subgraph with nested edges',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      subgraph cluster [Group A]
        A --> B
      end
      C --> A`,
  },
  {
    name: 'flowchart: directives skipped (class/classDef/style/click/linkStyle)',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A --> B
      classDef foo fill:#f00
      class A foo
      style A fill:#0f0
      linkStyle 0 stroke:#00f
      click A "https://example.com"`,
  },
  {
    name: 'flowchart: BOM + init directive prefix',
    type: 'flowchart',
    expect: 'parses',
    source: `﻿%%{init: {"theme":"default"}}%%
flowchart LR
  A --> B`,
  },
  {
    name: 'flowchart: icon directive (:::icon=foo)',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      Foo[Database]:::icon=logos:aws-rds`,
  },
  {
    name: 'flowchart: comment lines (%%)',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      %% this is a comment
      A --> B
      %% another one`,
  },
  {
    name: 'flowchart: multi-target shorthand (A & B --> C & D)',
    type: 'flowchart',
    expect: 'known-gap',
    note: 'Mermaid expands "A & B --> C & D" into four edges; merslim treats "A & B" as a literal id and fails to match',
    source: `flowchart LR
      A & B --> C & D`,
  },
  {
    name: 'flowchart: trapezoid shape [/Foo\\]',
    type: 'flowchart',
    expect: 'known-gap',
    note: 'Trapezoid shape not modeled; falls back to plain rect',
    source: `flowchart LR
      A[/Trapezoid\\] --> B`,
  },
  {
    name: 'flowchart: parallelogram shape [/Foo/]',
    type: 'flowchart',
    expect: 'parses',
    note: 'Parses but kind="process" (rect), not a distinct parallelogram',
    source: `flowchart LR
      A[/Parallelogram/] --> B`,
  },
  {
    name: 'flowchart: <br/> in node label',
    type: 'flowchart',
    expect: 'parses',
    note: 'Label contains the literal <br/> text; not rendered as a line break',
    source: `flowchart LR
      A["line 1<br/>line 2"] --> B`,
  },
  {
    name: 'flowchart: quoted label with special chars',
    type: 'flowchart',
    expect: 'parses',
    source: `flowchart LR
      A["a/b: c (d) e"] --> B`,
  },

  // ── Sequence ───────────────────────────────────────────────────────────
  {
    name: 'sequence: participant declarations with aliases',
    type: 'sequence',
    expect: 'parses',
    source: `sequenceDiagram
      participant A as Alice
      participant B as Bob
      A->>B: Hi`,
  },
  {
    name: 'sequence: actor keyword',
    type: 'sequence',
    expect: 'parses',
    source: `sequenceDiagram
      actor U as User
      participant S as Server
      U->>S: ping`,
  },
  {
    name: 'sequence: notes (left/right/over)',
    type: 'sequence',
    expect: 'parses',
    source: `sequenceDiagram
      participant A
      participant B
      Note left of A: hello
      Note right of B: world
      Note over A,B: both`,
  },
  {
    name: 'sequence: activation modifiers (+/-)',
    type: 'sequence',
    expect: 'parses',
    source: `sequenceDiagram
      A->>+B: do thing
      B-->>-A: done`,
  },
  {
    name: 'sequence: async/cross arrows',
    type: 'sequence',
    expect: 'parses',
    source: `sequenceDiagram
      A-)B: fire and forget
      A-xB: lost message`,
  },
  {
    name: 'sequence: control-flow blocks (loop/alt/opt/par)',
    type: 'sequence',
    expect: 'parses',
    note: 'Block keywords are skipped; only the inner messages parse — no visual nesting',
    source: `sequenceDiagram
      A->>B: start
      loop every 10s
        A->>B: ping
      end
      alt is_admin
        A->>B: admin
      else
        A->>B: user
      end`,
  },
  {
    name: 'sequence: autonumber directive',
    type: 'sequence',
    expect: 'parses',
    note: 'Autonumber keyword is skipped; messages parse without auto-numbering',
    source: `sequenceDiagram
      autonumber
      A->>B: one
      A->>B: two`,
  },
  {
    name: 'sequence: bidirectional arrow <<->>',
    type: 'sequence',
    expect: 'known-gap',
    note: 'Bidirectional arrows are a mermaid extension; merslim parses only the second half',
    source: `sequenceDiagram
      A<<->>B: bidir`,
  },

  // ── Class ──────────────────────────────────────────────────────────────
  {
    name: 'class: full block with members and inheritance',
    type: 'class',
    expect: 'parses',
    source: `classDiagram
      class Animal {
        +String name
        +makeSound() void
      }
      class Dog
      Animal <|-- Dog`,
  },
  {
    name: 'class: <<stereotype>> inside body',
    type: 'class',
    expect: 'parses',
    source: `classDiagram
      class Shape {
        <<interface>>
        +area() double
      }`,
  },
  {
    name: 'class: X : <<stereotype>> shorthand',
    type: 'class',
    expect: 'parses',
    source: `classDiagram
      Foo : <<abstract>>
      Foo : +bar() void`,
  },
  {
    name: 'class: all relation kinds',
    type: 'class',
    expect: 'parses',
    source: `classDiagram
      A <|-- B
      A *-- C
      A o-- D
      A -- E
      A <.. F
      A <|.. G`,
  },
  {
    name: 'class: generics class Container~T~',
    type: 'class',
    expect: 'known-gap',
    note: 'Generic-type syntax with tildes not parsed; class name treated as bare identifier without the type parameter',
    source: `classDiagram
      class Container~T~ {
        +T value
      }`,
  },
  {
    name: 'class: cardinality labels',
    type: 'class',
    expect: 'known-gap',
    note: 'Quoted cardinality ranges ("1", "*", "0..1") not modeled — label is parsed but cardinality info is lost',
    source: `classDiagram
      Customer "1" --> "*" Order`,
  },
  {
    name: 'class: namespace block',
    type: 'class',
    expect: 'known-gap',
    note: 'namespace block syntax not modeled',
    source: `classDiagram
      namespace BaseShapes {
        class Triangle
        class Rectangle
      }`,
  },

  // ── State ──────────────────────────────────────────────────────────────
  {
    name: 'state: start/end markers and transitions',
    type: 'state',
    expect: 'parses',
    source: `stateDiagram-v2
      [*] --> Idle
      Idle --> Active : start
      Active --> [*]`,
  },
  {
    name: 'state: composite states',
    type: 'state',
    expect: 'parses',
    source: `stateDiagram-v2
      state Outer {
        [*] --> Inner
        Inner --> [*]
      }`,
  },
  {
    name: 'state: parallel/concurrent regions (--)',
    type: 'state',
    expect: 'known-gap',
    note: 'Concurrent regions separated by "--" inside a composite not modeled',
    source: `stateDiagram-v2
      state Active {
        [*] --> A
        --
        [*] --> B
      }`,
  },
  {
    name: 'state: choice/fork/join pseudo-states',
    type: 'state',
    expect: 'known-gap',
    note: 'choice/fork/join pseudo-state declarations not modeled (treated as regular states)',
    source: `stateDiagram-v2
      state ch <<choice>>
      Idle --> ch
      ch --> Yes
      ch --> No`,
  },

  // ── ER ─────────────────────────────────────────────────────────────────
  {
    name: 'er: tables, columns, relations with PK/FK',
    type: 'er',
    expect: 'parses',
    source: `erDiagram
      CUSTOMER ||--o{ ORDER : places
      CUSTOMER {
        string name
        string email PK
      }
      ORDER {
        int id PK
        int customer_id FK
      }`,
  },
  {
    name: 'er: all cardinality combos',
    type: 'er',
    expect: 'parses',
    source: `erDiagram
      A ||--|| B : exact
      C ||--o{ D : zero-or-many
      E }o--o{ F : many-to-many
      G }|--|| H : one-or-many`,
  },
  {
    name: 'er: column with NOT NULL / UK markers',
    type: 'er',
    expect: 'parses',
    source: `erDiagram
      USER {
        string email PK
        string username UK
        string passhash
      }`,
  },

  // ── Gantt ──────────────────────────────────────────────────────────────
  {
    name: 'gantt: dates + after-deps + statuses',
    type: 'gantt',
    expect: 'parses',
    source: `gantt
      title Plan
      dateFormat YYYY-MM-DD
      section Phase 1
        Task A      :a1, 2026-01-01, 30d
        Task B      :after a1, 10d
        Done thing  :done, c1, 2026-02-15, 5d
        Critical    :crit, c2, 2026-02-20, 3d
        Milestone   :milestone, m1, 2026-03-01, 0d`,
  },
  {
    name: 'gantt: hour-duration tasks',
    type: 'gantt',
    expect: 'parses',
    source: `gantt
      dateFormat YYYY-MM-DD
      Task short :t1, 2026-01-01, 4h
      Task long  :t2, after t1, 2h`,
  },
  {
    name: 'gantt: after multiple deps (after a1 b1)',
    type: 'gantt',
    expect: 'parses',
    source: `gantt
      dateFormat YYYY-MM-DD
      A :a1, 2026-01-01, 3d
      B :b1, 2026-01-04, 2d
      C :after a1 b1, 4d`,
  },
  {
    name: 'gantt: excludes/todayMarker/tickInterval directives',
    type: 'gantt',
    expect: 'parses',
    note: 'Directives are accepted (skipped) but their effects are not modeled',
    source: `gantt
      dateFormat YYYY-MM-DD
      excludes weekends
      todayMarker stroke-width:2px
      tickInterval 1week
      A :a1, 2026-01-01, 5d`,
  },

  // ── Timeline ───────────────────────────────────────────────────────────
  {
    name: 'timeline: sections with multi-event periods',
    type: 'timeline',
    expect: 'parses',
    source: `timeline
      title History
      section Pre-2000
        1989 : Web invented
      section 2000s
        2004 : Facebook : Gmail`,
  },

  // ── Pie ────────────────────────────────────────────────────────────────
  {
    name: 'pie: showData + title + slices',
    type: 'pie',
    expect: 'parses',
    source: `pie showData
      title Sources
      "Search" : 62.5
      "Direct" : 22.3
      "Social" : 15.2`,
  },
  {
    name: 'pie: single slice',
    type: 'pie',
    expect: 'parses',
    source: `pie
      "Everything" : 100`,
  },

  // ── Quadrant ───────────────────────────────────────────────────────────
  {
    name: 'quadrant: all 4 quadrant labels + axes + points',
    type: 'quadrant',
    expect: 'parses',
    source: `quadrantChart
      title Reach vs Engagement
      x-axis Low --> High
      y-axis Low --> High
      quadrant-1 Stars
      quadrant-2 Niche
      quadrant-3 Underperformers
      quadrant-4 Mass appeal
      P1: [0.8, 0.9]
      P2: [0.2, 0.6]`,
  },

  // ── Journey ────────────────────────────────────────────────────────────
  {
    name: 'journey: sections + tasks with multiple actors',
    type: 'journey',
    expect: 'parses',
    source: `journey
      title My Day
      section AM
        Coffee: 4: Me, Cat
        Work: 3: Me, Team
      section PM
        Lunch: 5: Me`,
  },

  // ── Mindmap ────────────────────────────────────────────────────────────
  {
    name: 'mindmap: indent-based tree with shape variants',
    type: 'mindmap',
    expect: 'parses',
    source: `mindmap
  root((Root))
    Square[A square]
    Rounded(A rounded)
    Hexagon{{A hex}}
      Leaf 1
      Leaf 2`,
  },
  {
    name: 'mindmap: ::icon(...) suffix',
    type: 'mindmap',
    expect: 'parses',
    source: `mindmap
  root((Topics))
    Books ::icon(fa fa-book)
    Code ::icon(fa fa-code)`,
  },

  // ── Architecture ───────────────────────────────────────────────────────
  {
    name: 'architecture: groups, services, edges with sides',
    type: 'architecture',
    expect: 'parses',
    source: `architecture-beta
      group api(cloud)[API]
      service db(database)[Postgres] in api
      service web(server)[Web]
      db:L --> R:web`,
  },
  {
    name: 'architecture: nested groups (group in group)',
    type: 'architecture',
    expect: 'parses',
    source: `architecture-beta
      group outer(cloud)[Outer]
      group inner(cloud)[Inner] in outer
      service x(server)[X] in inner`,
  },

  // ── C4 ─────────────────────────────────────────────────────────────────
  {
    name: 'c4: Context with persons/systems/relations',
    type: 'c4',
    expect: 'parses',
    source: `C4Context
      title Banking
      Person(u, "User", "End user")
      System(b, "Banking", "Main system")
      System_Ext(e, "Email", "3rd-party")
      Rel(u, b, "Uses", "HTTPS")
      Rel(b, e, "Sends", "SMTP")`,
  },
  {
    name: 'c4: Container variant',
    type: 'c4',
    expect: 'parses',
    source: `C4Container
      Container(api, "API", "Node.js", "Backend service")
      ContainerDb(db, "DB", "Postgres", "Primary store")
      Rel(api, db, "Reads/writes")`,
  },
  {
    name: 'c4: System_Boundary nesting',
    type: 'c4',
    expect: 'parses',
    source: `C4Container
      System_Boundary(b1, "Org") {
        System(a, "A")
        System(b, "B")
      }`,
  },

  // ── GitGraph ───────────────────────────────────────────────────────────
  {
    name: 'gitgraph: commit/branch/checkout/merge',
    type: 'gitgraph',
    expect: 'parses',
    source: `gitGraph
      commit
      branch develop
      checkout develop
      commit id: "wip"
      commit tag: "v1.0"
      checkout main
      merge develop tag: "release"`,
  },
  {
    name: 'gitgraph: cherry-pick',
    type: 'gitgraph',
    expect: 'parses',
    source: `gitGraph
      commit id: "init"
      branch hotfix
      commit id: "fix"
      checkout main
      cherry-pick id: "fix"`,
  },
  {
    name: 'gitgraph: commit type HIGHLIGHT/REVERSE',
    type: 'gitgraph',
    expect: 'parses',
    source: `gitGraph
      commit type: HIGHLIGHT
      commit type: REVERSE`,
  },
];
