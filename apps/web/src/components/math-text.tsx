import React, { useMemo } from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import { Bn } from './ui';
import { hasMathTokens, splitTextAndMath, type TextSegment } from '../lib/mathParser';

export interface MathTextProps {
  text?: string | null;
  style?: StyleProp<TextStyle>;
  className?: string;
  numberOfLines?: number;
}

/**
 * MathText Component
 *
 * Intelligently renders questions, options, and solve notes.
 * - For non-math text: Passes through directly to `<Bn>` for zero overhead.
 * - For mathematical/scientific expressions: Renders high-fidelity KaTeX equations
 *   inline with proper baseline alignment and typography.
 */
export const MathText = React.memo(function MathText({
  text,
  style,
  className = '',
  numberOfLines,
}: MathTextProps) {
  if (!text) {
    return null;
  }

  // If there are no mathematical tokens, render standard Bn text
  if (!hasMathTokens(text)) {
    return (
      <Bn style={style} className={className} numberOfLines={numberOfLines}>
        {text}
      </Bn>
    );
  }

  // Parse into text and math segments
  const segments: TextSegment[] = useMemo(() => splitTextAndMath(text), [text]);

  // If only 1 text segment, fallback
  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <Bn style={style} className={className} numberOfLines={numberOfLines}>
        {segments[0].content}
      </Bn>
    );
  }

  // Ensure KaTeX stylesheet is loaded in browser head
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (!document.getElementById('katex-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'katex-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }

  // If running on Web, render inline HTML for KaTeX segments
  if (Platform.OS === 'web') {
    return (
      <Bn style={[{ whiteSpace: 'pre-wrap' } as any, style]} className={className} numberOfLines={numberOfLines}>
        {segments.map((seg, idx) => {
          if (seg.type === 'math' && seg.html) {
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  verticalAlign: 'baseline',
                  margin: '0 2px',
                }}
                dangerouslySetInnerHTML={{ __html: seg.html }}
              />
            );
          }
          return (
            <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
              {seg.content}
            </span>
          );
        })}
      </Bn>
    );
  }

  // Mobile / Native fallback: renders plain text
  return (
    <Bn style={style} className={className} numberOfLines={numberOfLines}>
      {text}
    </Bn>
  );
});
