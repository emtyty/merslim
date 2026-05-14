// Orthogonal (Manhattan) edge routing for the ASCII renderer.
//
// Given a source box and a target box, picks an exit point on each box and
// connects them with a horizontal-then-vertical (or vertical-then-horizontal)
// path. The path is drawn into an AsciiCanvas so the junction-merging logic
// in canvas.ts takes care of crossings.
//
// This isn't a "real" router — no obstacle avoidance, no jog optimization.
// For DAGs laid out by dagre with reasonable rank separation, simple L/Z
// shapes already read cleanly. Upgrading later (A* or channel routing) is
// possible without touching builder call sites.

import { AsciiCanvas } from './canvas';

export interface BoxRect {
  col: number;
  row: number;
  width: number;
  height: number;
}

const ARROW_RIGHT = '▶';
const ARROW_LEFT = '◀';
const ARROW_UP = '▲';
const ARROW_DOWN = '▼';

/** Side of a box. */
type Side = 'left' | 'right' | 'top' | 'bottom';

interface AnchorPoint {
  col: number;
  row: number;
  side: Side;
}

/** Pick an exit anchor on box A that faces box B. */
function pickAnchor(a: BoxRect, b: BoxRect): AnchorPoint {
  const aCenterX = a.col + Math.floor(a.width / 2);
  const aCenterY = a.row + Math.floor(a.height / 2);
  const bCenterX = b.col + Math.floor(b.width / 2);
  const bCenterY = b.row + Math.floor(b.height / 2);

  const dx = bCenterX - aCenterX;
  const dy = bCenterY - aCenterY;

  // Prefer horizontal exit when horizontal distance dominates, vertical
  // exit otherwise. Tied cases favor horizontal (LR is the most common
  // flow direction).
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) return { col: a.col + a.width - 1, row: aCenterY, side: 'right' };
    return { col: a.col, row: aCenterY, side: 'left' };
  }
  if (dy >= 0) return { col: aCenterX, row: a.row + a.height - 1, side: 'bottom' };
  return { col: aCenterX, row: a.row, side: 'top' };
}

// The arrowhead is placed at the destination's entry side. It must point
// INTO the box — so when the edge enters from the left side, the arrow
// glyph points right, etc.
function arrowFor(side: Side): string {
  switch (side) {
    case 'left':
      return ARROW_RIGHT;
    case 'right':
      return ARROW_LEFT;
    case 'top':
      return ARROW_DOWN;
    case 'bottom':
      return ARROW_UP;
  }
}

/** Step one cell outside the anchor in the direction it faces. */
function stepOut(p: AnchorPoint): { col: number; row: number } {
  switch (p.side) {
    case 'right':
      return { col: p.col + 1, row: p.row };
    case 'left':
      return { col: p.col - 1, row: p.row };
    case 'bottom':
      return { col: p.col, row: p.row + 1 };
    case 'top':
      return { col: p.col, row: p.row - 1 };
  }
}

export interface RouteOptions {
  /** Optional edge label printed near the midpoint. */
  label?: string;
  /** Hide the arrowhead at the target. Default: false (arrow shown). */
  noArrow?: boolean;
  /** Character used along the path. Default: standard box-drawing lines. */
  dashed?: boolean;
}

/** Route an orthogonal edge from `from` to `to`. Mutates the canvas. */
export function routeOrthogonal(
  canvas: AsciiCanvas,
  from: BoxRect,
  to: BoxRect,
  options: RouteOptions = {}
): void {
  const src = pickAnchor(from, to);
  const dst = pickAnchor(to, from);
  const start = stepOut(src);
  const end = stepOut(dst);

  // Pick path shape based on relative orientation of the anchors.
  // For horizontal-out anchors → go horizontal first then vertical.
  // For vertical-out anchors → go vertical first then horizontal.
  const horizontalFirst = src.side === 'left' || src.side === 'right';

  if (start.col === end.col || start.row === end.row) {
    // Straight line.
    if (start.row === end.row) {
      drawHSegment(canvas, start.col, end.col, start.row, options.dashed);
    } else {
      drawVSegment(canvas, start.col, start.row, end.row, options.dashed);
    }
  } else if (horizontalFirst) {
    drawHSegment(canvas, start.col, end.col, start.row, options.dashed);
    drawVSegment(canvas, end.col, start.row, end.row, options.dashed);
  } else {
    drawVSegment(canvas, start.col, start.row, end.row, options.dashed);
    drawHSegment(canvas, start.col, end.col, end.row, options.dashed);
  }

  if (!options.noArrow) {
    canvas.put(dst.col, dst.row, arrowFor(dst.side));
  }

  if (options.label) {
    // Place label adjacent to the path midpoint. Heuristic: on the row of
    // the longest horizontal segment if any, otherwise next to the start.
    const labelRow = horizontalFirst ? start.row - 1 : end.row - 1;
    const labelCol = Math.min(start.col, end.col) + 1;
    canvas.drawText(labelCol, Math.max(0, labelRow), options.label);
  }
}

function drawHSegment(canvas: AsciiCanvas, c1: number, c2: number, row: number, dashed?: boolean): void {
  const ch = dashed ? '╌' : '─';
  canvas.drawHLine(c1, c2, row, ch);
}

function drawVSegment(canvas: AsciiCanvas, col: number, r1: number, r2: number, dashed?: boolean): void {
  const ch = dashed ? '╎' : '│';
  canvas.drawVLine(col, r1, r2, ch);
}
