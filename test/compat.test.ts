// Mermaid-compatibility test: runs the hand-curated corpus through
// parseToIR and enforces each entry's `expect` annotation.
//
// See test/compatCorpus.ts for what each `expect` value means.

import { describe, expect, it } from 'vitest';
import { parseToIR } from '../src/utils/diagrams/parser';
import { COMPAT_CORPUS, type CompatEntry } from './compatCorpus';

function nonEmptyIR(ir: unknown): boolean {
  if (typeof ir !== 'object' || ir === null) return false;
  const r = ir as Record<string, unknown>;
  // Heuristic: every IR variant should have ≥1 of these populated for a
  // non-trivial source.
  const arrays = ['nodes', 'edges', 'tasks', 'events', 'slices', 'points', 'classes', 'states', 'elements', 'ops', 'sections', 'participants', 'steps'];
  for (const k of arrays) {
    const v = r[k];
    if (Array.isArray(v) && v.length > 0) return true;
  }
  // ER schema is nested
  if (r.schema && typeof r.schema === 'object') {
    const tables = (r.schema as { tables?: unknown[] }).tables;
    if (Array.isArray(tables) && tables.length > 0) return true;
  }
  // Mindmap stores tree in root.children
  if (r.root && typeof r.root === 'object') {
    const children = (r.root as { children?: unknown[] }).children;
    if (Array.isArray(children) && children.length > 0) return true;
  }
  return false;
}

const groupedByType = COMPAT_CORPUS.reduce(
  (acc, entry) => {
    (acc[entry.type] ??= []).push(entry);
    return acc;
  },
  {} as Record<CompatEntry['type'], CompatEntry[]>,
);

describe('Mermaid compatibility corpus', () => {
  for (const [type, entries] of Object.entries(groupedByType)) {
    describe(type, () => {
      for (const entry of entries) {
        if (entry.expect === 'known-gap') {
          // Known gaps are documented; the test exists to make sure the
          // parser doesn't *crash*, and to flag if behavior improves.
          it(`[known-gap] ${entry.name}`, async () => {
            const result = await parseToIR(entry.source);
            // Must not throw. Result can be either fail or partial success.
            expect(result).toBeDefined();
            // No assertion on ok=true/false — that's the whole point of "gap".
            // But if a gap suddenly produces a full, non-empty IR matching the
            // expected type, flag it so we can flip the annotation.
            if (result.ok && result.type === entry.type && nonEmptyIR(result.ir)) {
              // Soft signal — don't fail, just log.
              // eslint-disable-next-line no-console
              console.warn(`[compat] known-gap "${entry.name}" now parses cleanly — consider promoting to "parses".`);
            }
          });
          continue;
        }

        it(entry.name, async () => {
          const result = await parseToIR(entry.source);
          if (!result.ok) {
            throw new Error(
              `Expected ok=true for "${entry.name}" but got error: ${result.error}`,
            );
          }
          expect(result.type).toBe(entry.type);
          if (entry.expect === 'parses') {
            expect(
              nonEmptyIR(result.ir),
              `IR is empty for "${entry.name}" — parser ran but extracted nothing. IR: ${JSON.stringify(result.ir).slice(0, 200)}`,
            ).toBe(true);
          }
          // 'parses-empty' just requires ok=true; no content assertion.
        });
      }
    });
  }
});

describe('Corpus health', () => {
  it('every entry has a unique name', () => {
    const seen = new Set<string>();
    for (const entry of COMPAT_CORPUS) {
      expect(seen.has(entry.name), `Duplicate name: "${entry.name}"`).toBe(false);
      seen.add(entry.name);
    }
  });

  it('every known-gap has a note explaining what is missing', () => {
    for (const entry of COMPAT_CORPUS.filter((e) => e.expect === 'known-gap')) {
      expect(entry.note, `known-gap "${entry.name}" needs a note`).toBeTruthy();
    }
  });

  it('covers every supported diagram type', () => {
    const covered = new Set(COMPAT_CORPUS.map((e) => e.type));
    const expected = [
      'flowchart', 'sequence', 'er', 'class', 'state',
      'gantt', 'timeline', 'pie', 'quadrant', 'journey',
      'mindmap', 'architecture', 'c4', 'gitgraph',
    ];
    for (const t of expected) expect(covered).toContain(t);
  });
});
