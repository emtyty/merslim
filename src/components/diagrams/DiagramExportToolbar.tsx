import { useState, type MouseEvent } from 'react';
import {
  copySvgToClipboard,
  copyPngToClipboard,
  downloadSvg,
  downloadPng,
  type SvgSource,
} from '../../utils/diagrams/export';

// Shared 4-button toolbar (Copy SVG, Copy PNG, Download SVG, Download PNG)
// for any diagram-rendering surface. Renderer-agnostic: accepts any
// SvgSource (string, SVGSVGElement, or function returning one).
//
// Icons are inlined as <svg> rather than imported from an icon library so
// pure-headless consumers don't pull in a ~1.5MB transitive dependency.

interface DiagramExportToolbarProps {
  source: SvgSource;
  /** Filename prefix (no extension). Default: "diagram". */
  filenameBase?: string;
  /** PNG canvas resolution multiplier. Default: 2. */
  pngScale?: number;
  /** PNG background color. Pass `null` for transparent. Default: white. */
  pngBackground?: string | null;
  /** Outer container class (positioning, opacity, etc.). */
  className?: string;
  /** Called when an export operation throws. Default: silent. */
  onError?: (error: Error) => void;
}

type FlashState = 'idle' | 'svg-copied' | 'png-copied';

// ── Inline icons (Lucide stroke style, 11px) ──────────────────────────────
const ICON_PROPS = {
  width: 11,
  height: 11,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const IconCopy = () => (
  <svg {...ICON_PROPS}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCheck = (props: { color?: string }) => (
  <svg {...ICON_PROPS} stroke={props.color ?? 'currentColor'}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconDownload = () => (
  <svg {...ICON_PROPS}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconFileImage = () => (
  <svg {...ICON_PROPS}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="10" cy="13" r="2" />
    <path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22" />
  </svg>
);

const IconImageDown = () => (
  <svg {...ICON_PROPS}>
    <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3" />
    <path d="m14 19 3 3 3-3" />
    <path d="M17 22V13" />
    <circle cx="9" cy="9" r="2" />
  </svg>
);

export default function DiagramExportToolbar({
  source,
  filenameBase = 'diagram',
  pngScale = 2,
  pngBackground,
  className = '',
  onError,
}: DiagramExportToolbarProps) {
  const [flash, setFlash] = useState<FlashState>('idle');

  const flashAndReset = (state: Exclude<FlashState, 'idle'>) => {
    setFlash(state);
    setTimeout(() => setFlash('idle'), 2000);
  };

  const safe = async (fn: () => Promise<void>, e: MouseEvent) => {
    e.stopPropagation();
    try {
      await fn();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCopySvg = (e: MouseEvent) =>
    safe(async () => {
      await copySvgToClipboard(source);
      flashAndReset('svg-copied');
    }, e);

  const handleCopyPng = (e: MouseEvent) =>
    safe(async () => {
      await copyPngToClipboard(source, { scale: pngScale, background: pngBackground });
      flashAndReset('png-copied');
    }, e);

  const handleDownloadSvg = (e: MouseEvent) =>
    safe(() => downloadSvg(source, `${filenameBase}.svg`), e);

  const handleDownloadPng = (e: MouseEvent) =>
    safe(
      () => downloadPng(source, `${filenameBase}.png`, { scale: pngScale, background: pngBackground }),
      e
    );

  const buttonClass =
    'flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 text-[10px] font-bold shadow-sm transition-colors';

  return (
    <div className={`flex gap-1 ${className}`} role="toolbar" aria-label="Diagram export">
      <button
        type="button"
        onClick={handleCopySvg}
        className={buttonClass}
        aria-label="Copy SVG markup to clipboard"
        title="Copy SVG markup"
      >
        {flash === 'svg-copied' ? <IconCheck color="#22c55e" /> : <IconCopy />}
        {flash === 'svg-copied' ? 'Copied!' : 'SVG'}
      </button>
      <button
        type="button"
        onClick={handleCopyPng}
        className={buttonClass}
        aria-label="Copy diagram as PNG to clipboard"
        title="Copy as PNG image"
      >
        {flash === 'png-copied' ? <IconCheck color="#22c55e" /> : <IconFileImage />}
        {flash === 'png-copied' ? 'Copied!' : 'PNG'}
      </button>
      <button
        type="button"
        onClick={handleDownloadSvg}
        className={buttonClass}
        aria-label="Download diagram as SVG file"
        title="Download SVG"
      >
        <IconDownload /> SVG
      </button>
      <button
        type="button"
        onClick={handleDownloadPng}
        className={buttonClass}
        aria-label="Download diagram as PNG file"
        title="Download PNG"
      >
        <IconImageDown /> PNG
      </button>
    </div>
  );
}
