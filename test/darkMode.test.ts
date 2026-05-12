import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDarkMode, watchDarkMode } from '../src/components/diagrams/darkMode';

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

describe('isDarkMode', () => {
  it('returns false when no .dark class', () => {
    expect(isDarkMode()).toBe(false);
  });

  it('returns true when .dark is set on <html>', () => {
    document.documentElement.classList.add('dark');
    expect(isDarkMode()).toBe(true);
  });
});

describe('watchDarkMode', () => {
  it('fires the callback when the class toggles', async () => {
    const cb = vi.fn();
    const dispose = watchDarkMode(cb);
    document.documentElement.classList.add('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenCalledWith(true);
    document.documentElement.classList.remove('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).toHaveBeenLastCalledWith(false);
    dispose();
  });

  it('returns a disposer that stops further callbacks', async () => {
    const cb = vi.fn();
    const dispose = watchDarkMode(cb);
    dispose();
    document.documentElement.classList.add('dark');
    await new Promise((r) => setTimeout(r, 0));
    expect(cb).not.toHaveBeenCalled();
  });
});
