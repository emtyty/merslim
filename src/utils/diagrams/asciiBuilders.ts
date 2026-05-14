// IR → ASCII text builders.
//
// Parallel to svgBuilders.ts. Each builder accepts a typed IR and returns a
// plain string of Unicode box-drawing characters suitable for terminals,
// logs, code review comments, and plain-text email.
//
// Phase 1 covers: flowchart, state, sequence, class, ER, mindmap, gantt,
// journey. Phase 2 (timeline, quadrant, gitgraph, architecture, c4, pie)
// can land separately.

import { AsciiCanvas } from './ascii/canvas';
import { routeOrthogonal } from './ascii/router';
import { boxSizeForLabel, layoutFlowchartAscii } from './ascii/gridLayout';
import type {
  ArchitectureIR,
  ArchitectureNode,
  C4Element,
  C4ElementKind,
  C4IR,
  ClassDiagramIR,
  ClassMember,
  ERDiagramIR,
  FlowchartIR,
  GanttDiagramIR,
  GitGraphIR,
  JourneyIR,
  MindmapIR,
  MindmapNode,
  NodeIR,
  PieChartIR,
  QuadrantChartIR,
  SequenceIR,
  SequenceMessage,
  SequenceNote,
  StateDiagramIR,
  StateNode,
  TimelineIR,
} from './types';

// ── Flowchart ────────────────────────────────────────────────────────────

/** Render a flowchart as Unicode box-drawing text. Internally runs dagre
 *  with character-cell sizes so the result is grid-aligned. */
export function buildFlowchartAscii(ir: FlowchartIR): string {
  if (ir.nodes.length === 0) return '';

  const sizes = new Map<string, { width: number; height: number }>();
  for (const node of ir.nodes) {
    sizes.set(node.id, boxSizeForLabel(node.label || node.id));
  }
  const { positions } = layoutFlowchartAscii(ir, sizes);

  const canvas = new AsciiCanvas();
  for (const node of ir.nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    drawLabeledBox(canvas, pos.col, pos.row, pos.width, pos.height, node.label || node.id);
  }
  for (const edge of ir.edges) {
    const a = positions.get(edge.source);
    const b = positions.get(edge.target);
    if (!a || !b) continue;
    routeOrthogonal(canvas, a, b, {
      label: edge.label,
      dashed: edge.kind === 'dashed' || edge.kind === 'dotted',
      noArrow: edge.arrow?.target === 'none',
    });
  }
  return canvas.toString();
}

// ── State ───────────────────────────────────────────────────────────────

/** Render a state diagram. Reuses the flowchart layout pipeline by mapping
 *  each top-level state to a flowchart node. Composite states are flattened
 *  (their children are rendered at the top level). */
export function buildStateAscii(ir: StateDiagramIR): string {
  const flowNodes = ir.states.map<NodeIR>((s) => ({
    id: s.id,
    label: stateLabel(s),
    kind: s.kind === 'start' ? 'start' : s.kind === 'end' ? 'end' : 'process',
  }));
  const flowIR: FlowchartIR = {
    type: 'flowchart',
    direction: 'LR',
    nodes: flowNodes,
    edges: ir.transitions.map((t) => ({ source: t.source, target: t.target, label: t.label })),
  };
  return buildFlowchartAscii(flowIR);
}

function stateLabel(s: StateNode): string {
  if (s.kind === 'start') return '◉';
  if (s.kind === 'end') return '◎';
  return s.label || s.id;
}

// ── Sequence ────────────────────────────────────────────────────────────

const SEQ_LANE_WIDTH = 16; // character cells between participant centers
const SEQ_HEADER_ROW = 1;
const SEQ_HEADER_HEIGHT = 3;
const SEQ_FIRST_STEP_ROW = SEQ_HEADER_HEIGHT + 1; // first row below headers

export function buildSequenceAscii(ir: SequenceIR): string {
  const canvas = new AsciiCanvas();
  if (ir.participants.length === 0) return '';

  // Lane center columns
  const laneCenters = new Map<string, number>();
  ir.participants.forEach((p, i) => {
    laneCenters.set(p.id, 2 + i * SEQ_LANE_WIDTH + Math.floor(SEQ_LANE_WIDTH / 2));
  });

  // Header boxes
  for (const p of ir.participants) {
    const center = laneCenters.get(p.id)!;
    const w = Math.max(7, p.label.length + 4);
    const col = center - Math.floor(w / 2);
    drawLabeledBox(canvas, col, SEQ_HEADER_ROW, w, SEQ_HEADER_HEIGHT, p.label);
  }

  // Step rows and lifelines
  let row = SEQ_FIRST_STEP_ROW;
  for (const step of ir.steps) {
    if (step.kind === 'message') drawSequenceMessage(canvas, step, laneCenters, row);
    else drawSequenceNote(canvas, step, laneCenters, row);
    row += 2;
  }

  // Draw lifelines AFTER messages so message arrows merge nicely at junctions.
  // Note: we draw the lifeline first as a dashed vertical, then re-stamp the
  // arrow heads. AsciiCanvas put() with merge=false overwrites.
  for (const p of ir.participants) {
    const center = laneCenters.get(p.id)!;
    // Lifeline runs from just under the header to just past the last step.
    drawLifeline(canvas, center, SEQ_HEADER_ROW + SEQ_HEADER_HEIGHT, row);
  }

  // Now redraw step content on TOP of the lifelines.
  row = SEQ_FIRST_STEP_ROW;
  for (const step of ir.steps) {
    if (step.kind === 'message') drawSequenceMessage(canvas, step, laneCenters, row);
    else drawSequenceNote(canvas, step, laneCenters, row);
    row += 2;
  }

  return canvas.toString();
}

function drawLifeline(canvas: AsciiCanvas, col: number, rowStart: number, rowEnd: number): void {
  for (let r = rowStart; r < rowEnd; r++) canvas.put(col, r, '┊');
}

function drawSequenceMessage(
  canvas: AsciiCanvas,
  msg: SequenceMessage,
  laneCenters: Map<string, number>,
  row: number
): void {
  const from = laneCenters.get(msg.from);
  const to = laneCenters.get(msg.to);
  if (from === undefined || to === undefined) return;

  if (from === to) {
    // Self-message: render as a small loop on the right of the lane.
    canvas.put(from, row, '├');
    canvas.drawHLine(from + 1, from + 4, row, '─');
    canvas.put(from + 4, row, '┐');
    canvas.put(from + 4, row + 1, '┘');
    canvas.put(from + 1, row + 1, '◀');
    canvas.drawText(from + 6, row, msg.label);
    return;
  }

  const dashed = msg.arrow === 'async' || msg.arrow === 'reply';
  const ch = dashed ? '╌' : '─';
  const [a, b] = from < to ? [from, to] : [to, from];
  canvas.drawHLine(a + 1, b - 1, row, ch);
  // Arrowhead
  if (msg.arrow === 'cross') {
    canvas.put(to < from ? a + 1 : b - 1, row, '✕');
  } else {
    canvas.put(to < from ? a + 1 : b - 1, row, to > from ? '▶' : '◀');
  }
  // Tail tick on the source lane
  canvas.put(from, row, '┤');
  // Label centered above the line
  if (msg.label) {
    const midCol = Math.floor((a + b) / 2) - Math.floor(msg.label.length / 2);
    canvas.drawText(midCol, row - 1, msg.label);
  }
}

function drawSequenceNote(
  canvas: AsciiCanvas,
  note: SequenceNote,
  laneCenters: Map<string, number>,
  row: number
): void {
  const cols = note.participants
    .map((id) => laneCenters.get(id))
    .filter((c): c is number => c !== undefined);
  if (cols.length === 0) return;

  const anchorCol = cols[0];
  const labelW = note.text.length + 4;
  const startCol = note.side === 'left' ? Math.max(0, anchorCol - labelW - 1) : anchorCol + 2;
  drawLabeledBox(canvas, startCol, row - 1, labelW, 3, note.text);
}

// ── Class diagram ───────────────────────────────────────────────────────

export function buildClassAscii(ir: ClassDiagramIR): string {
  if (ir.classes.length === 0) return '';

  // Each class becomes a flowchart node so dagre handles layout, but we
  // draw the box contents (header + members) manually.
  const widthFor = (clsIdx: number) => {
    const cls = ir.classes[clsIdx];
    let w = cls.label.length + 4;
    for (const m of cls.members) w = Math.max(w, formatMember(m).length + 4);
    return Math.max(14, w);
  };
  const heightFor = (clsIdx: number) => {
    const cls = ir.classes[clsIdx];
    // top border + header + separator + member rows + bottom border
    return 4 + Math.max(1, cls.members.length);
  };

  const sizes = new Map<string, { width: number; height: number }>();
  ir.classes.forEach((cls, i) => {
    sizes.set(cls.id, { width: widthFor(i), height: heightFor(i) });
  });
  const flowIR: FlowchartIR = {
    type: 'flowchart',
    direction: 'TB',
    nodes: ir.classes.map((c) => ({ id: c.id, label: c.label, kind: 'process' })),
    edges: ir.relations.map((r) => ({
      source: r.source,
      target: r.target,
      label: r.label,
    })),
  };
  const { positions } = layoutFlowchartAscii(flowIR, sizes);

  const canvas = new AsciiCanvas();
  for (const cls of ir.classes) {
    const pos = positions.get(cls.id);
    if (!pos) continue;
    // Outline + header
    canvas.drawBox(pos.col, pos.row, pos.width, pos.height);
    // Header: stereotype on line 1 if present, else class name centered
    const header = cls.stereotype ? `${cls.stereotype} ${cls.label}` : cls.label;
    canvas.drawText(pos.col + Math.max(1, Math.floor((pos.width - header.length) / 2)), pos.row + 1, header);
    // Separator below header
    canvas.drawBoxSeparator(pos.col, pos.row + 2, pos.width);
    // Members
    cls.members.forEach((m, i) => {
      canvas.drawText(pos.col + 1, pos.row + 3 + i, formatMember(m).slice(0, pos.width - 2));
    });
  }
  for (const rel of ir.relations) {
    const a = positions.get(rel.source);
    const b = positions.get(rel.target);
    if (!a || !b) continue;
    routeOrthogonal(canvas, a, b, { label: rel.label, dashed: rel.kind === 'dependency' || rel.kind === 'realization' });
  }
  return canvas.toString();
}

function formatMember(m: ClassMember): string {
  const vis = m.visibility === 'private' ? '-' : m.visibility === 'protected' ? '#' : m.visibility === 'package' ? '~' : '+';
  if (m.kind === 'method') {
    const params = m.parameters ?? '';
    const ret = m.returnType ? ` ${m.returnType}` : '';
    return `${vis} ${m.name}(${params})${ret}`;
  }
  const t = m.returnType ? `: ${m.returnType}` : '';
  return `${vis} ${m.name}${t}`;
}

// ── ER diagram ──────────────────────────────────────────────────────────

export function buildErAscii(ir: ERDiagramIR): string {
  const tables = ir.schema.tables;
  if (tables.length === 0) return '';

  const widthFor = (tableIdx: number) => {
    const t = tables[tableIdx];
    let w = t.name.length + 4;
    for (const c of t.columns) w = Math.max(w, formatErColumn(c).length + 4);
    return Math.max(16, w);
  };
  const heightFor = (tableIdx: number) => 4 + Math.max(1, tables[tableIdx].columns.length);

  const sizes = new Map<string, { width: number; height: number }>();
  tables.forEach((t, i) => sizes.set(t.name, { width: widthFor(i), height: heightFor(i) }));

  const flowIR: FlowchartIR = {
    type: 'flowchart',
    direction: 'LR',
    nodes: tables.map((t) => ({ id: t.name, label: t.name, kind: 'database' })),
    edges: ir.schema.relations.map((r) => ({ source: r.fromTable, target: r.toTable })),
  };
  const { positions } = layoutFlowchartAscii(flowIR, sizes);

  const canvas = new AsciiCanvas();
  for (const t of tables) {
    const pos = positions.get(t.name);
    if (!pos) continue;
    canvas.drawBox(pos.col, pos.row, pos.width, pos.height);
    canvas.drawText(pos.col + Math.max(1, Math.floor((pos.width - t.name.length) / 2)), pos.row + 1, t.name);
    canvas.drawBoxSeparator(pos.col, pos.row + 2, pos.width);
    t.columns.forEach((c, i) => {
      canvas.drawText(pos.col + 1, pos.row + 3 + i, formatErColumn(c).slice(0, pos.width - 2));
    });
  }
  for (const rel of ir.schema.relations) {
    const a = positions.get(rel.fromTable);
    const b = positions.get(rel.toTable);
    if (!a || !b) continue;
    // For mermaid-style ER syntax (`CUSTOMER ||--o{ ORDER : places`), the
    // parser stores the relationship verb in both fromCol and toCol — so
    // rendering them with an arrow between would produce `places→places`.
    // Collapse to a single label when they match.
    const label = rel.fromCol === rel.toCol ? rel.fromCol : `${rel.fromCol}→${rel.toCol}`;
    routeOrthogonal(canvas, a, b, { label, dashed: rel.nullable });
  }
  return canvas.toString();
}

function formatErColumn(c: { name: string; type: string; isPK: boolean; isFK: boolean }): string {
  const marker = c.isPK ? '*' : c.isFK ? '+' : ' ';
  return `${marker} ${c.name}: ${c.type}`;
}

// ── Mindmap ─────────────────────────────────────────────────────────────

export function buildMindmapAscii(ir: MindmapIR): string {
  const lines: string[] = [];
  walkMindmap(ir.root, '', true, true, lines);
  return lines.join('\n');
}

function walkMindmap(node: MindmapNode, prefix: string, isLast: boolean, isRoot: boolean, out: string[]): void {
  if (isRoot) {
    out.push(`● ${node.label}`);
  } else {
    const branch = isLast ? '└─ ' : '├─ ';
    out.push(`${prefix}${branch}${shapeBullet(node.shape)} ${node.label}`);
  }
  const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
  node.children.forEach((child, i) => {
    walkMindmap(child, childPrefix, i === node.children.length - 1, false, out);
  });
}

function shapeBullet(shape: MindmapNode['shape']): string {
  switch (shape) {
    case 'circle':
      return '○';
    case 'square':
      return '▪';
    case 'rounded':
      return '◆';
    case 'cloud':
      return '☁';
    case 'bang':
      return '✦';
    case 'hexagon':
      return '⬡';
    default:
      return '·';
  }
}

// ── Gantt ───────────────────────────────────────────────────────────────

const GANTT_BAR_WIDTH = 40;

export function buildGanttAscii(ir: GanttDiagramIR): string {
  if (ir.tasks.length === 0) return '';

  const starts = ir.tasks.map((t) => Date.parse(t.start));
  const ends = ir.tasks.map((t) => Date.parse(t.end));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(1, max - min);

  const labelW = Math.max(...ir.tasks.map((t) => t.label.length), 4);
  const dateW = 10; // "YYYY-MM-DD"
  const lines: string[] = [];
  if (ir.title) {
    lines.push(ir.title);
    lines.push('');
  }
  // Header
  lines.push(
    `${padRight('Task', labelW)}  ${padRight('Start', dateW)}  ${padRight('End', dateW)}  Timeline`
  );
  lines.push(
    `${'─'.repeat(labelW)}  ${'─'.repeat(dateW)}  ${'─'.repeat(dateW)}  ${'─'.repeat(GANTT_BAR_WIDTH)}`
  );

  let currentSection: string | undefined;
  for (const t of ir.tasks) {
    if (t.section && t.section !== currentSection) {
      currentSection = t.section;
      lines.push('');
      lines.push(`▼ ${currentSection}`);
    }
    const s = Date.parse(t.start);
    const e = Date.parse(t.end);
    const barStart = Math.round(((s - min) / span) * GANTT_BAR_WIDTH);
    const barEnd = Math.max(barStart + 1, Math.round(((e - min) / span) * GANTT_BAR_WIDTH));
    const fill = ganttFillChar(t.status);
    const bar =
      ' '.repeat(barStart) +
      fill.repeat(Math.min(GANTT_BAR_WIDTH - barStart, barEnd - barStart)) +
      ' '.repeat(Math.max(0, GANTT_BAR_WIDTH - barEnd));
    lines.push(
      `${padRight(t.label, labelW)}  ${padRight(t.start.slice(0, 10), dateW)}  ${padRight(t.end.slice(0, 10), dateW)}  ${bar}`
    );
  }
  return lines.join('\n');
}

function ganttFillChar(status: string): string {
  switch (status) {
    case 'done':
      return '█';
    case 'active':
      return '▓';
    case 'crit':
      return '▒';
    case 'milestone':
      return '◆';
    default:
      return '░';
  }
}

// ── Journey ─────────────────────────────────────────────────────────────

export function buildJourneyAscii(ir: JourneyIR): string {
  const lines: string[] = [];
  if (ir.title) {
    lines.push(ir.title);
    lines.push('═'.repeat(Math.max(4, ir.title.length)));
    lines.push('');
  }
  for (const section of ir.sections) {
    lines.push(`▼ ${section.title}`);
    for (const task of section.tasks) {
      const score = Math.max(0, Math.min(7, Math.round(task.score)));
      const stars = '★'.repeat(score) + '☆'.repeat(7 - score);
      const actors = task.actors.length > 0 ? `  (${task.actors.join(', ')})` : '';
      lines.push(`  ${stars}  ${task.label}${actors}`);
    }
    lines.push('');
  }
  // Trim trailing blank line
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

// ── Pie (horizontal bar chart) ──────────────────────────────────────────

const PIE_BAR_WIDTH = 20;

export function buildPieAscii(ir: PieChartIR): string {
  if (ir.slices.length === 0) return '';
  const total = ir.slices.reduce((s, x) => s + x.value, 0);
  const labelW = Math.max(...ir.slices.map((s) => s.label.length), 4);
  const lines: string[] = [];
  if (ir.title) {
    lines.push(ir.title);
    lines.push('═'.repeat(Math.max(4, ir.title.length)));
    lines.push('');
  }
  for (const s of ir.slices) {
    const pct = total > 0 ? (s.value / total) * 100 : 0;
    const filled = Math.round((pct / 100) * PIE_BAR_WIDTH);
    const bar = '█'.repeat(filled) + '░'.repeat(PIE_BAR_WIDTH - filled);
    lines.push(`${padRight(s.label, labelW)}  ${bar}  ${pct.toFixed(1).padStart(5)}%`);
  }
  return lines.join('\n');
}

// ── Timeline ────────────────────────────────────────────────────────────

/** Vertical timeline: each section becomes a header line, each event a
 *  `period │ text` row. Multi-line event text wraps into continuation rows
 *  aligned under the period column. */
export function buildTimelineAscii(ir: TimelineIR): string {
  if (ir.events.length === 0) return '';
  const lines: string[] = [];
  if (ir.title) {
    lines.push(ir.title);
    lines.push('═'.repeat(Math.max(4, ir.title.length)));
    lines.push('');
  }

  // Group events by section while preserving original order.
  const sectionOrder: (string | undefined)[] = [];
  const grouped = new Map<string | undefined, TimelineIR['events']>();
  for (const ev of ir.events) {
    const key = ev.section;
    if (!grouped.has(key)) {
      sectionOrder.push(key);
      grouped.set(key, []);
    }
    grouped.get(key)!.push(ev);
  }

  const periodW = Math.max(...ir.events.map((e) => e.period.length), 4);

  for (const section of sectionOrder) {
    if (section) {
      const header = ` ${section} `;
      lines.push(`═══${header}${'═'.repeat(Math.max(4, 24 - header.length))}`);
    }
    for (const ev of grouped.get(section)!) {
      // Event text may contain colon-separated multi-events from the parser.
      const segments = ev.text.split(/\s*:\s*/);
      lines.push(`  ${padRight(ev.period, periodW)}  │  ${segments[0]}`);
      for (let i = 1; i < segments.length; i++) {
        lines.push(`  ${' '.repeat(periodW)}  │  ${segments[i]}`);
      }
    }
    lines.push('');
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

// ── Quadrant ────────────────────────────────────────────────────────────

const QUAD_INNER_WIDTH = 40;
const QUAD_INNER_HEIGHT = 12;

/** Quadrant chart: a bordered grid with axis labels around the edges, the
 *  four quadrant labels in their corners, and points plotted at their
 *  scaled (x,y) coordinates. */
export function buildQuadrantAscii(ir: QuadrantChartIR): string {
  const canvas = new AsciiCanvas();
  // Reserve column 0 for the y-axis label, col 2 for the box left border.
  const yLabelCol = 0;
  const boxLeft = 14;
  const boxTop = 2;
  const boxRight = boxLeft + QUAD_INNER_WIDTH + 1;
  const boxBottom = boxTop + QUAD_INNER_HEIGHT + 1;

  if (ir.title) canvas.drawText(boxLeft, 0, ir.title);

  // High y label above the box, low below.
  if (ir.yAxisLabel) {
    canvas.drawText(boxLeft, boxTop - 1, ir.yAxisLabel.high);
    canvas.drawText(boxLeft, boxBottom + 1, ir.yAxisLabel.low);
  }
  // Low/high x labels on left/right of the box's vertical center.
  if (ir.xAxisLabel) {
    canvas.drawText(yLabelCol, boxTop + Math.floor(QUAD_INNER_HEIGHT / 2), ir.xAxisLabel.low.slice(0, boxLeft - 2));
    canvas.drawText(boxRight + 2, boxTop + Math.floor(QUAD_INNER_HEIGHT / 2), ir.xAxisLabel.high);
  }

  canvas.drawBox(boxLeft, boxTop, QUAD_INNER_WIDTH + 2, QUAD_INNER_HEIGHT + 2);
  // Cross-hair in the middle (axes through center).
  const midCol = boxLeft + 1 + Math.floor(QUAD_INNER_WIDTH / 2);
  const midRow = boxTop + 1 + Math.floor(QUAD_INNER_HEIGHT / 2);
  canvas.drawHLine(boxLeft + 1, boxRight - 1, midRow, '─');
  canvas.drawVLine(midCol, boxTop + 1, boxBottom - 1, '│');
  canvas.put(midCol, midRow, '┼', true);

  // Quadrant labels (1=top-right, 2=top-left, 3=bottom-left, 4=bottom-right).
  if (ir.quadrantLabels) {
    const q = ir.quadrantLabels;
    if (q.q2) canvas.drawText(boxLeft + 2, boxTop + 1, q.q2);
    if (q.q1) canvas.drawText(boxRight - 1 - q.q1.length, boxTop + 1, q.q1);
    if (q.q3) canvas.drawText(boxLeft + 2, boxBottom - 1, q.q3);
    if (q.q4) canvas.drawText(boxRight - 1 - q.q4.length, boxBottom - 1, q.q4);
  }

  // Plot points.
  for (const pt of ir.points) {
    const col = boxLeft + 1 + Math.round(pt.x * (QUAD_INNER_WIDTH - 1));
    // y=1 is the TOP of the quadrant, so invert.
    const row = boxTop + 1 + Math.round((1 - pt.y) * (QUAD_INNER_HEIGHT - 1));
    canvas.put(col, row, '●');
    // Label slightly to the right of the point.
    canvas.drawText(col + 1, row, ` ${pt.label}`);
  }

  return canvas.toString();
}

// ── GitGraph ────────────────────────────────────────────────────────────

/** GitGraph: each branch is a vertical swim-lane. Commits are nodes on
 *  their lane; merges draw a horizontal jog from the source lane back to
 *  the target lane on the merge row. */
export function buildGitGraphAscii(ir: GitGraphIR): string {
  if (ir.ops.length === 0) return '';

  // Walk ops to discover branches in order, assign columns, and emit rows.
  const branchOrder: string[] = ['main'];
  const branchCol = new Map<string, number>();
  branchCol.set('main', 0);
  let currentBranch = 'main';

  interface RowEvent {
    kind: 'commit' | 'merge' | 'branch' | 'cherry-pick';
    branch: string;
    fromBranch?: string;
    label?: string;
    tag?: string;
  }
  const rows: RowEvent[] = [];

  for (const op of ir.ops) {
    switch (op.kind) {
      case 'branch': {
        if (!branchCol.has(op.name)) {
          branchOrder.push(op.name);
          branchCol.set(op.name, branchOrder.length - 1);
        }
        currentBranch = op.name;
        rows.push({ kind: 'branch', branch: op.name, fromBranch: currentBranch });
        break;
      }
      case 'checkout':
        currentBranch = op.name;
        break;
      case 'commit':
        rows.push({ kind: 'commit', branch: currentBranch, label: op.id, tag: op.tag });
        break;
      case 'merge':
        rows.push({ kind: 'merge', branch: currentBranch, fromBranch: op.from, tag: op.tag });
        break;
      case 'cherry-pick':
        rows.push({ kind: 'cherry-pick', branch: currentBranch, label: op.commitId });
        break;
    }
  }

  // Column spacing has to accommodate the widest branch name so the header
  // row doesn't collide.
  const COL_SPACING = Math.max(4, ...branchOrder.map((b) => b.length + 1));
  const colFor = (b: string) => (branchCol.get(b) ?? 0) * COL_SPACING;
  const labelStartCol = (branchOrder.length - 1) * COL_SPACING + 6;
  const canvas = new AsciiCanvas();

  // Header row: branch names along the top.
  branchOrder.forEach((name) => {
    canvas.drawText(colFor(name), 0, name);
  });

  // Pre-draw vertical branch lines from header to bottom.
  const totalRows = rows.length;
  branchOrder.forEach((name) => {
    canvas.drawVLine(colFor(name), 1, totalRows + 1, '│');
  });

  rows.forEach((ev, idx) => {
    const row = idx + 1;
    const col = colFor(ev.branch);
    if (ev.kind === 'commit') {
      canvas.put(col, row, '●');
      const annot = [ev.label && `id:${ev.label}`, ev.tag && `tag:${ev.tag}`].filter(Boolean).join(' ');
      if (annot) canvas.drawText(labelStartCol, row, annot);
    } else if (ev.kind === 'merge') {
      const fromCol = colFor(ev.fromBranch!);
      canvas.put(col, row, '●');
      canvas.put(fromCol, row, '●');
      const [a, b] = fromCol < col ? [fromCol, col] : [col, fromCol];
      canvas.drawHLine(a + 1, b - 1, row, '─');
      const annot = ['merge', ev.fromBranch && `from:${ev.fromBranch}`, ev.tag && `tag:${ev.tag}`]
        .filter(Boolean)
        .join(' ');
      canvas.drawText(labelStartCol, row, annot);
    } else if (ev.kind === 'branch') {
      canvas.put(col, row, '┬', true);
      canvas.drawText(labelStartCol, row, `branch ${ev.branch}`);
    } else if (ev.kind === 'cherry-pick') {
      canvas.put(col, row, '◆');
      canvas.drawText(labelStartCol, row, `cherry-pick ${ev.label ?? ''}`);
    }
  });

  return canvas.toString();
}

// ── Architecture ────────────────────────────────────────────────────────

/** Architecture-beta: services laid out via dagre, groups drawn as bounding
 *  boxes around their children. Edges connect services with orthogonal
 *  routing. */
export function buildArchitectureAscii(ir: ArchitectureIR): string {
  const services = ir.nodes.filter((n) => n.kind === 'service');
  const groups = ir.nodes.filter((n) => n.kind === 'group');
  if (services.length === 0 && groups.length === 0) return '';

  const sizes = new Map<string, { width: number; height: number }>();
  for (const s of services) sizes.set(s.id, boxSizeForLabel(s.label || s.id));

  // Layout via dagre; ignore group hierarchy at layout time but use it to
  // draw enclosing rectangles afterwards.
  const flowIR: FlowchartIR = {
    type: 'flowchart',
    direction: 'LR',
    nodes: services.map<NodeIR>((s) => ({ id: s.id, label: s.label, kind: 'service' })),
    edges: ir.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  };
  const { positions } = layoutFlowchartAscii(flowIR, sizes);

  const canvas = new AsciiCanvas();
  // Group bounding boxes first (so service boxes draw on top of group lines).
  for (const g of groups) {
    const children = services.filter((s) => s.parent === g.id);
    if (children.length === 0) continue;
    const childPositions = children.map((c) => positions.get(c.id)).filter((p): p is NonNullable<typeof p> => !!p);
    if (childPositions.length === 0) continue;
    const left = Math.min(...childPositions.map((p) => p.col)) - 2;
    const right = Math.max(...childPositions.map((p) => p.col + p.width - 1)) + 2;
    const top = Math.min(...childPositions.map((p) => p.row)) - 2;
    const bottom = Math.max(...childPositions.map((p) => p.row + p.height - 1)) + 1;
    canvas.drawBox(left, top, right - left + 1, bottom - top + 1);
    canvas.drawText(left + 2, top, ` ${g.label} `);
  }

  for (const s of services) {
    const pos = positions.get(s.id);
    if (!pos) continue;
    drawLabeledBox(canvas, pos.col, pos.row, pos.width, pos.height, s.label);
  }
  for (const edge of ir.edges) {
    const a = positions.get(edge.source);
    const b = positions.get(edge.target);
    if (!a || !b) continue;
    routeOrthogonal(canvas, a, b, { label: edge.label });
  }
  return canvas.toString();
}

// ── C4 ──────────────────────────────────────────────────────────────────

/** C4 model: each element rendered as a multi-line box (label + kind tag +
 *  description), connected with labeled edges. */
export function buildC4Ascii(ir: C4IR): string {
  if (ir.elements.length === 0) return '';

  const sizes = new Map<string, { width: number; height: number }>();
  for (const el of ir.elements) {
    const lines = c4ElementLines(el);
    const width = Math.max(...lines.map((l) => l.length), 12) + 4;
    const height = lines.length + 2;
    sizes.set(el.id, { width, height });
  }

  const flowIR: FlowchartIR = {
    type: 'flowchart',
    direction: 'TB',
    nodes: ir.elements.map<NodeIR>((e) => ({ id: e.id, label: e.label, kind: 'service' })),
    edges: ir.relations.map((r) => ({ source: r.source, target: r.target, label: r.label })),
  };
  const { positions } = layoutFlowchartAscii(flowIR, sizes);

  const canvas = new AsciiCanvas();
  if (ir.title) canvas.drawText(0, 0, ir.title);

  for (const el of ir.elements) {
    const pos = positions.get(el.id);
    if (!pos) continue;
    const offsetRow = ir.title ? pos.row + 2 : pos.row;
    canvas.drawBox(pos.col, offsetRow, pos.width, pos.height, { clear: true });
    const lines = c4ElementLines(el);
    lines.forEach((line, i) => {
      canvas.drawText(pos.col + 2, offsetRow + 1 + i, line.slice(0, pos.width - 4));
    });
  }
  for (const rel of ir.relations) {
    const a = positions.get(rel.source);
    const b = positions.get(rel.target);
    if (!a || !b) continue;
    const titleOffset = ir.title ? 2 : 0;
    const offsetA = { ...a, row: a.row + titleOffset };
    const offsetB = { ...b, row: b.row + titleOffset };
    const label = [rel.label, rel.technology && `(${rel.technology})`].filter(Boolean).join(' ');
    routeOrthogonal(canvas, offsetA, offsetB, { label });
  }
  return canvas.toString();
}

function c4ElementLines(el: C4Element): string[] {
  const lines: string[] = [el.label, `«${c4KindTag(el.kind)}»`];
  if (el.technology) lines.push(`[${el.technology}]`);
  if (el.description) {
    // Truncate descriptions to 40 chars on a single line.
    lines.push(el.description.length > 40 ? el.description.slice(0, 39) + '…' : el.description);
  }
  return lines;
}

function c4KindTag(kind: C4ElementKind): string {
  switch (kind) {
    case 'person':
      return 'Person';
    case 'person-external':
      return 'Person (external)';
    case 'system':
      return 'System';
    case 'system-external':
      return 'System (external)';
    case 'system-db':
      return 'System (DB)';
    case 'system-queue':
      return 'System (Queue)';
    case 'container':
      return 'Container';
    case 'container-external':
      return 'Container (external)';
    case 'container-db':
      return 'Container (DB)';
    case 'container-queue':
      return 'Container (Queue)';
    case 'component':
      return 'Component';
    case 'component-external':
      return 'Component (external)';
    case 'component-db':
      return 'Component (DB)';
    case 'component-queue':
      return 'Component (Queue)';
    case 'boundary':
    case 'system-boundary':
    case 'container-boundary':
    case 'enterprise-boundary':
      return 'Boundary';
    case 'node':
      return 'Node';
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────

function padRight(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function drawLabeledBox(
  canvas: AsciiCanvas,
  col: number,
  row: number,
  width: number,
  height: number,
  label: string
): void {
  canvas.drawBox(col, row, width, height, { clear: true });
  const inner = Math.max(0, width - 2);
  const text = label.length > inner ? label.slice(0, Math.max(0, inner - 1)) + '…' : label;
  const textCol = col + Math.max(1, Math.floor((width - text.length) / 2));
  const textRow = row + Math.floor(height / 2);
  canvas.drawText(textCol, textRow, text);
}
