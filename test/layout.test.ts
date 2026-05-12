import { describe, expect, it } from 'vitest';
import { layoutFlowchart } from '../src/utils/diagrams/layout/dagreLayout';
import type { FlowchartIR } from '../src/utils/diagrams/types';

function makeIR(direction: FlowchartIR['direction'] = 'TB'): FlowchartIR {
  return {
    type: 'flowchart',
    direction,
    nodes: [
      { id: 'a', label: 'Start', kind: 'start' },
      { id: 'b', label: 'Middle', kind: 'process' },
      { id: 'c', label: 'End', kind: 'end' },
    ],
    edges: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ],
    subgraphs: [],
  };
}

describe('layoutFlowchart', () => {
  it('returns positions for every node', () => {
    const result = layoutFlowchart(makeIR());
    expect(result.nodePositions.size).toBe(3);
    for (const id of ['a', 'b', 'c']) {
      const pos = result.nodePositions.get(id)!;
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });

  it('produces a non-zero bounding box', () => {
    const result = layoutFlowchart(makeIR());
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('TB ranks vertically, LR ranks horizontally', () => {
    const tb = layoutFlowchart(makeIR('TB'));
    const lr = layoutFlowchart(makeIR('LR'));
    const tbA = tb.nodePositions.get('a')!;
    const tbC = tb.nodePositions.get('c')!;
    expect(tbC.y).toBeGreaterThan(tbA.y);
    const lrA = lr.nodePositions.get('a')!;
    const lrC = lr.nodePositions.get('c')!;
    expect(lrC.x).toBeGreaterThan(lrA.x);
  });

  it('respects per-node sizes', () => {
    const nodeSizes = new Map([
      ['a', { width: 300, height: 100 }],
      ['b', { width: 50, height: 20 }],
      ['c', { width: 100, height: 40 }],
    ]);
    const result = layoutFlowchart(makeIR(), { nodeSizes });
    expect(result.width).toBeGreaterThan(300);
  });

  it('skips edges referencing unknown nodes', () => {
    const ir: FlowchartIR = {
      type: 'flowchart',
      direction: 'TB',
      nodes: [{ id: 'a', label: 'A', kind: 'plain' }],
      edges: [{ source: 'a', target: 'ghost' }],
    };
    expect(() => layoutFlowchart(ir)).not.toThrow();
  });

  it('handles subgraphs (compound layout)', () => {
    const ir: FlowchartIR = {
      type: 'flowchart',
      direction: 'TB',
      nodes: [
        { id: 'a', label: 'A', kind: 'plain', subgraph: 'cluster' },
        { id: 'b', label: 'B', kind: 'plain', subgraph: 'cluster' },
      ],
      edges: [{ source: 'a', target: 'b' }],
      subgraphs: [{ id: 'cluster', label: 'Group' }],
    };
    const result = layoutFlowchart(ir);
    expect(result.nodePositions.size).toBe(2);
  });
});
