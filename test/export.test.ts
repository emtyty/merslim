import { describe, expect, it } from 'vitest';
import {
  INLINEABLE_STYLE_PROPS,
  getSvgDimensions,
  toSvgString,
} from '../src/utils/diagrams/export';

describe('getSvgDimensions', () => {
  it('reads dimensions from viewBox', () => {
    expect(getSvgDimensions('<svg viewBox="0 0 320 240"></svg>')).toEqual({
      width: 320,
      height: 240,
    });
  });

  it('reads dimensions from comma-separated viewBox', () => {
    expect(getSvgDimensions('<svg viewBox="0,0,100,50"></svg>')).toEqual({
      width: 100,
      height: 50,
    });
  });

  it('falls back to width/height attributes', () => {
    expect(getSvgDimensions('<svg width="200" height="150"></svg>')).toEqual({
      width: 200,
      height: 150,
    });
  });

  it('returns 800x600 fallback when nothing parseable', () => {
    expect(getSvgDimensions('<svg></svg>')).toEqual({ width: 800, height: 600 });
  });

  it('rejects negative / zero viewBox dimensions', () => {
    const dims = getSvgDimensions('<svg viewBox="0 0 0 0"></svg>');
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });
});

describe('toSvgString', () => {
  it('passes through string sources unchanged', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    expect(toSvgString(input)).toBe(input);
  });

  it('resolves a function source', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    const out = toSvgString(() => svg);
    expect(out).toContain('<svg');
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('throws when the resolver returns null', () => {
    expect(() => toSvgString(() => null)).toThrow(/null/i);
  });

  it('adds xmlns when missing on DOM source', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const out = toSvgString(svg, { inlineStyles: false });
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('strips foreignObject by default', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.textContent = 'leak';
    svg.appendChild(fo);
    const stripped = toSvgString(svg, { inlineStyles: false });
    expect(stripped).not.toContain('foreignObject');
    const kept = toSvgString(svg, { inlineStyles: false, stripForeignObject: false });
    expect(kept).toContain('foreignObject');
  });
});

describe('INLINEABLE_STYLE_PROPS', () => {
  it('contains the core SVG visual props', () => {
    expect(INLINEABLE_STYLE_PROPS).toContain('fill');
    expect(INLINEABLE_STYLE_PROPS).toContain('stroke');
    expect(INLINEABLE_STYLE_PROPS).toContain('font-family');
    expect(INLINEABLE_STYLE_PROPS.length).toBeGreaterThan(10);
  });
});
