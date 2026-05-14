// One-call convenience: mermaid source string → ASCII text.
//
// Wraps `parseToIR` and dispatches to the matching ASCII builder. Every
// supported diagram type has a builder — returns null only when the source
// itself cannot be parsed (empty input or unrecognized syntax).

import {
  buildArchitectureAscii,
  buildC4Ascii,
  buildClassAscii,
  buildErAscii,
  buildFlowchartAscii,
  buildGanttAscii,
  buildGitGraphAscii,
  buildJourneyAscii,
  buildMindmapAscii,
  buildPieAscii,
  buildQuadrantAscii,
  buildSequenceAscii,
  buildStateAscii,
  buildTimelineAscii,
} from './asciiBuilders';
import { parseToIR } from './parser';
import type {
  ArchitectureIR,
  C4IR,
  ClassDiagramIR,
  DiagramIR,
  ERDiagramIR,
  FlowchartIR,
  GanttDiagramIR,
  GitGraphIR,
  JourneyIR,
  MindmapIR,
  PieChartIR,
  QuadrantChartIR,
  SequenceIR,
  StateDiagramIR,
  TimelineIR,
} from './types';

/** Synchronous IR → ASCII dispatch. Covers all 14 diagram types. Callers
 *  that already have an IR (e.g. the React toolbar) use this; callers with
 *  a raw source string use `sourceToAscii` instead. */
export function asciiFromIR(ir: DiagramIR): string | null {
  switch (ir.type) {
    case 'flowchart':
      return buildFlowchartAscii(ir as FlowchartIR);
    case 'state':
      return buildStateAscii(ir as StateDiagramIR);
    case 'sequence':
      return buildSequenceAscii(ir as SequenceIR);
    case 'class':
      return buildClassAscii(ir as ClassDiagramIR);
    case 'er':
      return buildErAscii(ir as ERDiagramIR);
    case 'mindmap':
      return buildMindmapAscii(ir as MindmapIR);
    case 'gantt':
      return buildGanttAscii(ir as GanttDiagramIR);
    case 'journey':
      return buildJourneyAscii(ir as JourneyIR);
    case 'pie':
      return buildPieAscii(ir as PieChartIR);
    case 'timeline':
      return buildTimelineAscii(ir as TimelineIR);
    case 'quadrant':
      return buildQuadrantAscii(ir as QuadrantChartIR);
    case 'gitgraph':
      return buildGitGraphAscii(ir as GitGraphIR);
    case 'architecture':
      return buildArchitectureAscii(ir as ArchitectureIR);
    case 'c4':
      return buildC4Ascii(ir as C4IR);
  }
}

export async function sourceToAscii(source: string): Promise<string | null> {
  const parsed = await parseToIR(source);
  if (!parsed.ok) return null;
  return asciiFromIR(parsed.ir);
}
