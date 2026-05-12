export const SAMPLES: Record<string, { label: string; source: string }> = {
  flowchart: {
    label: 'Flowchart',
    source: `flowchart LR
  A[Receive order] --> B{Payment OK?}
  B -- yes --> C[Ship]
  B -- no --> D[Cancel]
  C --> E((Done))
  D --> E`,
  },
  sequence: {
    label: 'Sequence',
    source: `sequenceDiagram
  participant U as User
  participant A as API
  participant D as DB
  U->>A: GET /orders
  A->>D: SELECT *
  D-->>A: rows
  A-->>U: 200 OK
  Note over A,D: Cached for 60s`,
  },
  er: {
    label: 'ER Diagram',
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
    date placed_at
  }
  LINE_ITEM {
    int order_id FK
    string sku
    int qty
  }`,
  },
  class: {
    label: 'Class',
    source: `classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Dog {
    +bark() void
  }
  class Cat {
    +purr() void
  }
  Animal <|-- Dog
  Animal <|-- Cat`,
  },
  state: {
    label: 'State',
    source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch
  Loading --> Success : ok
  Loading --> Error : fail
  Success --> Idle : reset
  Error --> Idle : retry
  Success --> [*]`,
  },
  gantt: {
    label: 'Gantt',
    source: `gantt
  title Sprint plan
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
  timeline: {
    label: 'Timeline',
    source: `timeline
  title History of the Web
  section Pre-2000
    1989 : Web invented
    1993 : Mosaic browser
  section 2000s
    2003 : MySpace
    2004 : Facebook : Gmail
  section 2010s
    2010 : Instagram
    2016 : TikTok`,
  },
  pie: {
    label: 'Pie',
    source: `pie showData
  title Traffic sources
  "Search" : 62.5
  "Direct" : 22.3
  "Social" : 15.2`,
  },
  quadrant: {
    label: 'Quadrant',
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
  journey: {
    label: 'Journey',
    source: `journey
  title My morning
  section Wake up
    Open eyes: 5: Me
    Brew coffee: 4: Me, Cat
  section Get to work
    Commute: 2: Me
    Stand-up: 3: Me, Team`,
  },
  mindmap: {
    label: 'Mindmap',
    source: `mindmap
  root((Brain))
    Origins
      Long history
      Popularisation
    Research
      On effectiveness
      On Automatic creation
    Tools
      Pen and paper
      Mermaid`,
  },
  architecture: {
    label: 'Architecture',
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
  c4: {
    label: 'C4 Context',
    source: `C4Context
  title System Context — Internet Banking
  Person(customer, "Customer", "A bank customer")
  System(banking, "Internet Banking", "Allows customers to view accounts")
  System_Ext(email, "Email System", "Sends notifications")
  Rel(customer, banking, "Uses", "HTTPS")
  Rel(banking, email, "Sends emails", "SMTP")`,
  },
  gitgraph: {
    label: 'GitGraph',
    source: `gitGraph
  commit
  commit
  branch develop
  checkout develop
  commit id: "wip"
  commit tag: "alpha"
  checkout main
  merge develop tag: "v1.0"
  commit`,
  },
};

export type SampleKey = keyof typeof SAMPLES;
