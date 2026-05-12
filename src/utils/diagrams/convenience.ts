// Convenience builders — one-call IR → SVG for the graph-shaped diagrams
// that otherwise require the caller to compute a position map first.
//
// Power users who need custom layout can still call the position-taking
// builders (`buildFlowchartSvg`, `buildClassSvg`, `buildErSvg`) directly.

import dagre from 'dagre';
import { layoutFlowchart, type NodeSize } from './layout/dagreLayout';
import {
  buildClassSvg,
  buildErSvg,
  buildFlowchartSvg,
} from './svgBuilders';
import type {
  ClassDiagramIR,
  ERDiagramIR,
  FlowchartIR,
} from './types';

interface BuildOptions {
  dark?: boolean;
  padding?: number;
}

// Sizing constants — must stay in sync with the renderer components.
const FLOW_DEFAULT_SIZE: NodeSize = { width: 180, height: 60 };
const CLASS_NODE_WIDTH = 220;
const ER_NODE_WIDTH = 240;
const ER_HEADER_H = 34;
const ER_ROW_H = 26;

function flowchartNodeSize(label: string): NodeSize {
  const len = label.length;
  return {
    width: Math.max(160, Math.min(320, len * 8 + 40)),
    height: 48,
  };
}

/** One-call flowchart → SVG. Internally runs dagre layout. */
export function flowchartToSvg(ir: FlowchartIR, options: BuildOptions = {}): string {
  const nodeSizes = new Map<string, NodeSize>();
  for (const node of ir.nodes) {
    nodeSizes.set(node.id, flowchartNodeSize(node.label || node.id));
  }
  const { nodePositions } = layoutFlowchart(ir, {
    defaultNodeSize: FLOW_DEFAULT_SIZE,
    nodeSizes,
  });
  return buildFlowchartSvg(ir, nodePositions, options);
}

/** One-call class diagram → SVG. */
export function classToSvg(ir: ClassDiagramIR, options: BuildOptions = {}): string {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  const sizeFor = (memberCount: number) => ({
    width: CLASS_NODE_WIDTH,
    height: Math.max(64, 40 + memberCount * 18),
  });
  for (const cls of ir.classes) g.setNode(cls.id, sizeFor(cls.members.length));
  for (const rel of ir.relations) {
    if (g.hasNode(rel.source) && g.hasNode(rel.target)) g.setEdge(rel.source, rel.target);
  }
  dagre.layout(g);
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const cls of ir.classes) {
    const { x, y } = g.node(cls.id) as { x: number; y: number };
    const size = sizeFor(cls.members.length);
    positions.set(cls.id, {
      x: x - size.width / 2,
      y: y - size.height / 2,
      width: size.width,
      height: size.height,
    });
  }
  return buildClassSvg(ir, positions, options);
}

/** One-call ER diagram → SVG. */
export function erToSvg(ir: ERDiagramIR, options: BuildOptions = {}): string {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  const tableHeight = (cols: number) => ER_HEADER_H + cols * ER_ROW_H;

  for (const table of ir.schema.tables) {
    g.setNode(table.name, {
      width: ER_NODE_WIDTH,
      height: tableHeight(table.columns.length),
    });
  }
  for (const rel of ir.schema.relations) {
    if (g.hasNode(rel.fromTable) && g.hasNode(rel.toTable)) {
      g.setEdge(rel.fromTable, rel.toTable);
    }
  }
  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const table of ir.schema.tables) {
    const { x, y } = g.node(table.name) as { x: number; y: number };
    const h = tableHeight(table.columns.length);
    positions.set(table.name, {
      x: x - ER_NODE_WIDTH / 2,
      y: y - h / 2,
      width: ER_NODE_WIDTH,
      height: h,
    });
  }
  return buildErSvg(ir, positions, options);
}
