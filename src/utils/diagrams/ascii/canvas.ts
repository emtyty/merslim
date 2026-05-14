// 2D character grid with junction-aware line drawing.
//
// Used by the ASCII renderers as a paint surface: builders compute integer
// (col,row) coordinates from an IR, then call `drawBox`, `drawHLine`,
// `drawVLine`, `drawText`, etc. When two lines cross, the canvas picks the
// right Unicode box-drawing junction (┼ ├ ┤ ┬ ┴) automatically.
//
// All coordinates are in character cells. The canvas grows on demand —
// writing to (col=20, row=5) on an initially-empty canvas allocates the
// required rows/columns and pads with spaces.

const SPACE = ' ';

// Box-drawing character classification. Each glyph reports which of its four
// edges (left/right/up/down) is occupied; the junction merger ORs the masks
// of two overlapping glyphs and looks up the result.
const enum Edge {
  None = 0,
  L = 1,
  R = 2,
  U = 4,
  D = 8,
}

const GLYPH_EDGES: Record<string, number> = {
  '─': Edge.L | Edge.R,
  '│': Edge.U | Edge.D,
  '┌': Edge.R | Edge.D,
  '┐': Edge.L | Edge.D,
  '└': Edge.R | Edge.U,
  '┘': Edge.L | Edge.U,
  '├': Edge.R | Edge.U | Edge.D,
  '┤': Edge.L | Edge.U | Edge.D,
  '┬': Edge.L | Edge.R | Edge.D,
  '┴': Edge.L | Edge.R | Edge.U,
  '┼': Edge.L | Edge.R | Edge.U | Edge.D,
};

// Reverse lookup: edge mask → glyph.
const EDGES_TO_GLYPH: Record<number, string> = {};
for (const [glyph, mask] of Object.entries(GLYPH_EDGES)) {
  EDGES_TO_GLYPH[mask] = glyph;
}

/** Merge a glyph into an existing cell, picking the right junction char.
 *  Returns the new glyph; falls back to the incoming glyph if either side
 *  isn't a known box-drawing char. */
function mergeGlyph(existing: string, incoming: string): string {
  const a = GLYPH_EDGES[existing];
  const b = GLYPH_EDGES[incoming];
  if (a === undefined || b === undefined) return incoming;
  const merged = a | b;
  return EDGES_TO_GLYPH[merged] ?? incoming;
}

export class AsciiCanvas {
  private rows: string[][] = [];

  /** Current width (max cols across all rows). */
  get width(): number {
    let max = 0;
    for (const r of this.rows) if (r.length > max) max = r.length;
    return max;
  }

  /** Current height (number of rows). */
  get height(): number {
    return this.rows.length;
  }

  private ensure(col: number, row: number): void {
    while (this.rows.length <= row) this.rows.push([]);
    const r = this.rows[row];
    while (r.length <= col) r.push(SPACE);
  }

  /** Write a single character at (col,row). Negative coords are clamped to 0.
   *  When `merge` is true and both glyphs are known box-drawing chars, the
   *  junction char that connects them is chosen automatically. */
  put(col: number, row: number, ch: string, merge = false): void {
    if (ch.length === 0) return;
    const c = Math.max(0, Math.round(col));
    const r = Math.max(0, Math.round(row));
    this.ensure(c, r);
    const cur = this.rows[r][c];
    this.rows[r][c] = merge ? mergeGlyph(cur, ch) : ch;
  }

  /** Write a string starting at (col,row). Does not wrap. */
  drawText(col: number, row: number, text: string): void {
    const c0 = Math.max(0, Math.round(col));
    const r = Math.max(0, Math.round(row));
    for (let i = 0; i < text.length; i++) {
      this.ensure(c0 + i, r);
      this.rows[r][c0 + i] = text[i];
    }
  }

  /** Draw a horizontal line from (col1,row) to (col2,row), inclusive. */
  drawHLine(col1: number, col2: number, row: number, ch = '─'): void {
    const [a, b] = col1 <= col2 ? [col1, col2] : [col2, col1];
    for (let c = a; c <= b; c++) this.put(c, row, ch, true);
  }

  /** Draw a vertical line from (col,row1) to (col,row2), inclusive. */
  drawVLine(col: number, row1: number, row2: number, ch = '│'): void {
    const [a, b] = row1 <= row2 ? [row1, row2] : [row2, row1];
    for (let r = a; r <= b; r++) this.put(col, r, ch, true);
  }

  /** Draw a rectangle outline. Interior is NOT cleared — pass `clear: true`
   *  to fill the inside with spaces (useful when boxes might overlap with
   *  earlier-drawn content). */
  drawBox(
    col: number,
    row: number,
    width: number,
    height: number,
    options: { clear?: boolean } = {}
  ): void {
    if (width < 2 || height < 2) return;
    const x2 = col + width - 1;
    const y2 = row + height - 1;
    if (options.clear) {
      for (let r = row + 1; r < y2; r++) {
        for (let c = col + 1; c < x2; c++) this.put(c, r, SPACE);
      }
    }
    this.put(col, row, '┌');
    this.put(x2, row, '┐');
    this.put(col, y2, '└');
    this.put(x2, y2, '┘');
    if (width > 2) {
      this.drawHLine(col + 1, x2 - 1, row, '─');
      this.drawHLine(col + 1, x2 - 1, y2, '─');
    }
    if (height > 2) {
      this.drawVLine(col, row + 1, y2 - 1, '│');
      this.drawVLine(x2, row + 1, y2 - 1, '│');
    }
  }

  /** Draw a horizontal separator inside an existing box at the given row.
   *  Uses `├` and `┤` for the endpoints so the box outline stays connected. */
  drawBoxSeparator(col: number, row: number, width: number): void {
    if (width < 2) return;
    const x2 = col + width - 1;
    this.drawHLine(col + 1, x2 - 1, row, '─');
    this.put(col, row, '├', true);
    this.put(x2, row, '┤', true);
  }

  /** Serialize the canvas to a single string, right-trimming each row to
   *  avoid trailing whitespace. */
  toString(): string {
    const w = this.width;
    return this.rows
      .map((row) => {
        // pad short rows to width so layout is rectangular when consumers
        // care about column alignment, but trim trailing spaces to keep
        // output clean for diffs / clipboards.
        const padded = row.length < w ? row.concat(Array(w - row.length).fill(SPACE)) : row;
        return padded.join('').replace(/\s+$/, '');
      })
      .join('\n');
  }
}
