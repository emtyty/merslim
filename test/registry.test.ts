import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetRegistry,
  getRenderer,
  hasRenderer,
  register,
} from '../src/utils/diagrams/registry';

afterEach(() => _resetRegistry());

describe('renderer registry', () => {
  it('returns null for unregistered types', () => {
    expect(getRenderer('flowchart')).toBeNull();
    expect(hasRenderer('flowchart')).toBe(false);
  });

  it('stores and retrieves renderer entries', () => {
    const loader = async () => ({ default: () => null }) as any;
    register({ type: 'flowchart', loader });
    expect(hasRenderer('flowchart')).toBe(true);
    expect(getRenderer('flowchart')?.loader).toBe(loader);
  });

  it('last-write wins on re-register', () => {
    const a = async () => ({ default: () => null }) as any;
    const b = async () => ({ default: () => null }) as any;
    register({ type: 'pie', loader: a });
    register({ type: 'pie', loader: b });
    expect(getRenderer('pie')?.loader).toBe(b);
  });

  it('_resetRegistry clears all entries', () => {
    register({ type: 'pie', loader: async () => ({ default: () => null }) as any });
    _resetRegistry();
    expect(hasRenderer('pie')).toBe(false);
  });
});
