// Dagre-based layout adapter for ASCII rendering.
//
// Reuses the same engine as the SVG flowchart layout (layoutFlowchart from
// ../layout/dagreLayout) — but feeds it character-cell sizes and snaps the
// resulting floating-point coordinates to integer grid positions. The
// builders only ever deal with integer (col, row) so there's no aliasing.

import { layoutFlowchart, type NodeSize } from '../layout/dagreLayout';
import type { FlowchartIR } from '../types';

export interface GridBoxPosition {
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface GridLayoutResult {
  positions: Map<string, GridBoxPosition>;
  /** Bounding box of the entire layout in character cells. */
  width: number;
  height: number;
}

/** Estimate the cell size (chars × rows) for a labeled box. Includes a 2-col
 *  horizontal padding for the border. Default minimum height = 3 (top border,
 *  label row, bottom border). */
export function boxSizeForLabel(label: string, options: { minWidth?: number; height?: number } = {}): NodeSize {
  const minWidth = options.minWidth ?? 7;
  const height = options.height ?? 3;
  return { width: Math.max(minWidth, label.length + 4), height };
}

/** Run dagre on a FlowchartIR using character-cell node sizes, then snap to
 *  integer grid coordinates suitable for `AsciiCanvas`. */
export function layoutFlowchartAscii(
  ir: FlowchartIR,
  nodeSizes: Map<string, NodeSize>
): GridLayoutResult {
  // Dagre's nodesep/ranksep are measured in the same units as node sizes,
  // i.e. character cells here. 4-cell rank gap leaves room for arrows
  // ('─→ '), 2-cell node gap for vertical channel spacing.
  //
  // We deliberately strip edge labels before handing the IR to dagre. With
  // labels, dagre reserves vertical space for the label text in each rank
  // gap — at character-cell granularity that can mean 20+ blank rows between
  // ranks for a 10-char label. The ASCII builders draw their own edge
  // labels along the orthogonal path, so dagre doesn't need to know about
  // them.
  const labellessIR: FlowchartIR = {
    ...ir,
    edges: ir.edges.map((e) => ({ ...e, label: undefined })),
  };
  const { nodePositions, width, height } = layoutFlowchart(labellessIR, {
    defaultNodeSize: { width: 12, height: 3 },
    nodeSizes,
    nodeSeparation: 2,
    rankSeparation: 4,
    margin: 1,
  });

  const positions = new Map<string, GridBoxPosition>();
  for (const [id, { x, y }] of nodePositions) {
    const size = nodeSizes.get(id) ?? { width: 12, height: 3 };
    positions.set(id, {
      col: Math.max(0, Math.round(x)),
      row: Math.max(0, Math.round(y)),
      width: size.width,
      height: size.height,
    });
  }

  return {
    positions,
    width: Math.ceil(width),
    height: Math.ceil(height),
  };
}
