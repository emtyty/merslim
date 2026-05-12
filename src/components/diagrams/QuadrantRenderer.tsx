import { useEffect, useMemo, useRef } from 'react';
import type { RendererHandle, RendererProps } from '../../utils/diagrams/registry';
import { getDiagramTheme } from './shared/theme';
import { buildQuadrantSvg, svgStringToElement } from '../../utils/diagrams/svgBuilders';

type QuadrantRendererProps = RendererProps<'quadrant'>;

export default function QuadrantRenderer({ ir, dark = false, handleRef }: QuadrantRendererProps) {
  const theme = getDiagramTheme(dark);
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(() => buildQuadrantSvg(ir, { dark }), [ir, dark]);

  useEffect(() => {
    if (!handleRef) return;
    const handle: RendererHandle = {
      getSvgElement: () => svgStringToElement(svg),
    };
    handleRef.current = handle;
    return () => {
      if (handleRef.current === handle) handleRef.current = null;
    };
  }, [handleRef, svg]);

  return (
    <div
      ref={containerRef}
      className="quadrant-renderer"
      style={{ width: '100%', background: theme.canvasBg, borderRadius: 12, padding: 12, overflow: 'auto' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
