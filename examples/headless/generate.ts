// End-to-end example: parse a mermaid-style source string, build a
// self-contained SVG **and** a Unicode-box-drawing ASCII rendering, and
// write both to disk. Run with:
//
//   npm install && npm start
//
// One `.svg` plus one `.txt` per diagram type lands in ./out/.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  asciiFromIR,
  buildArchitectureSvg,
  buildC4Svg,
  buildGanttSvg,
  buildGitGraphSvg,
  buildJourneySvg,
  buildPieSvg,
  buildQuadrantSvg,
  buildTimelineSvg,
  classToSvg,
  erToSvg,
  flowchartToSvg,
  parseToIR,
  type ArchitectureIR,
  type C4IR,
  type ClassDiagramIR,
  type ERDiagramIR,
  type FlowchartIR,
  type GanttDiagramIR,
  type GitGraphIR,
  type JourneyIR,
  type PieChartIR,
  type QuadrantChartIR,
  type TimelineIR,
} from 'merslim';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'out');

const SAMPLES: { name: string; source: string }[] = [
  {
    name: 'flowchart',
    source: `flowchart LR
      A[Receive order] --> B{Payment OK?}
      B -- yes --> C[Ship]
      B -- no --> D[Cancel]
      C --> E((Done))
      D --> E`,
  },
  {
    name: 'class',
    source: `classDiagram
      class Animal {
        <<abstract>>
        +String name
        +makeSound() void
      }
      class Dog { +bark() void }
      class Cat { +purr() void }
      Animal <|-- Dog
      Animal <|-- Cat`,
  },
  {
    name: 'er',
    source: `erDiagram
      CUSTOMER ||--o{ ORDER : places
      ORDER ||--|{ LINE_ITEM : contains
      CUSTOMER {
        string name
        string email PK
      }
      ORDER {
        int id PK
        int customer_id FK
      }
      LINE_ITEM {
        int order_id FK
        string sku
        int qty
      }`,
  },
  {
    name: 'pie',
    source: `pie showData
      title Traffic sources
      "Search" : 62.5
      "Direct" : 22.3
      "Social" : 15.2`,
  },
  {
    name: 'quadrant',
    source: `quadrantChart
      title Reach vs Engagement
      x-axis Low Reach --> High Reach
      y-axis Low Engagement --> High Engagement
      quadrant-1 Stars
      quadrant-2 Niche
      quadrant-3 Underperformers
      quadrant-4 Mass appeal
      Campaign A: [0.8, 0.9]
      Campaign B: [0.2, 0.6]
      Campaign C: [0.7, 0.3]`,
  },
  {
    name: 'journey',
    source: `journey
      title My morning
      section Wake up
        Open eyes: 5: Me
        Brew coffee: 4: Me, Cat
      section Get to work
        Commute: 2: Me
        Stand-up: 3: Me, Team`,
  },
  {
    name: 'gantt',
    source: `gantt
      title Project plan
      dateFormat YYYY-MM-DD
      section Design
        Wireframes :a1, 2026-01-01, 7d
        Mockups    :after a1, 5d
      section Build
        Backend    :crit, 2026-01-15, 14d
        Frontend   :active, 2026-01-15, 14d
      section Ship
        Launch     :milestone, 2026-02-01, 0d`,
  },
  {
    name: 'timeline',
    source: `timeline
      title History of the Web
      section Pre-2000
        1989 : Tim Berners-Lee invents the Web
        1993 : Mosaic browser
      section 2000s
        2003 : MySpace
        2004 : Facebook : Gmail
      section 2010s
        2010 : Instagram
        2016 : TikTok`,
  },
  {
    name: 'gitGraph',
    source: `gitGraph
      commit
      commit
      branch develop
      checkout develop
      commit id: "wip"
      commit tag: "alpha"
      checkout main
      merge develop tag: "v1.0"`,
  },
  {
    name: 'architecture',
    source: `architecture-beta
      group api(cloud)[API Cluster]
      service web(server)[Web] in api
      service api_svc(server)[API] in api
      service db(database)[Postgres]
      service cache(disk)[Redis]
      web:R --> L:api_svc
      api_svc:R --> L:db
      api_svc:B --> T:cache`,
  },
  {
    name: 'c4-context',
    source: `C4Context
      title System Context — Internet Banking
      Person(customer, "Customer", "A bank customer")
      System(banking, "Internet Banking", "Allows customers to view accounts")
      System_Ext(email, "Email System", "Sends notifications")
      Rel(customer, banking, "Uses", "HTTPS")
      Rel(banking, email, "Sends emails", "SMTP")`,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { name, source } of SAMPLES) {
    const parsed = await parseToIR(source);
    if (!parsed.ok || !parsed.ir) {
      console.error(`✗ ${name}: parse failed (${parsed.ok ? 'no IR' : parsed.error})`);
      continue;
    }
    const svg = renderToSvg(parsed.ir);
    const svgPath = join(OUT_DIR, `${name}.svg`);
    await writeFile(svgPath, svg, 'utf8');

    const ascii = asciiFromIR(parsed.ir);
    if (ascii !== null) {
      const txtPath = join(OUT_DIR, `${name}.txt`);
      await writeFile(txtPath, ascii, 'utf8');
      console.log(
        `✓ ${name}  →  ${svgPath} (${svg.length.toLocaleString()} bytes) + ${txtPath} (${ascii.length.toLocaleString()} chars)`
      );
    } else {
      console.log(`✓ ${name}  →  ${svgPath} (${svg.length.toLocaleString()} bytes) [no ASCII builder]`);
    }
  }
}

type IR = NonNullable<Awaited<ReturnType<typeof parseToIR>> extends { ir: infer T } ? T : never>;

function renderToSvg(ir: IR): string {
  switch (ir.type) {
    case 'flowchart':
      return flowchartToSvg(ir as FlowchartIR);
    case 'class':
      return classToSvg(ir as ClassDiagramIR);
    case 'er':
      return erToSvg(ir as ERDiagramIR);
    case 'pie':
      return buildPieSvg(ir as PieChartIR);
    case 'quadrant':
      return buildQuadrantSvg(ir as QuadrantChartIR);
    case 'journey':
      return buildJourneySvg(ir as JourneyIR);
    case 'gantt':
      return buildGanttSvg(ir as GanttDiagramIR);
    case 'timeline':
      return buildTimelineSvg(ir as TimelineIR);
    case 'gitgraph':
      return buildGitGraphSvg(ir as GitGraphIR);
    case 'architecture':
      return buildArchitectureSvg(ir as ArchitectureIR);
    case 'c4':
      return buildC4Svg(ir as C4IR);
    default:
      throw new Error(`No headless builder for ${ir.type}. State and mindmap need explicit position maps.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
