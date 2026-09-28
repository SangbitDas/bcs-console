import React, { useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Bn } from './bn';
import {
  hasMathTokens,
  hasRichTags,
  splitRichSegments,
  splitTextAndMath,
} from '../lib/mathParser';

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
 * - For plain non-math, non-formatted text: Passes through directly to `<Bn>` for zero overhead.
 * - For rich formatted text: Renders clean, accessible underlines (<u>), bold (<b>), italics (<i>).
 * - For math: Renders high-fidelity KaTeX equations inline.
 */
export const MathText = React.memo(function MathText({
  text,
  style,
  className = '',
  numberOfLines,
}: MathTextProps) {
  const raw = text ?? '';
  const flags = useMemo(
    () => ({ rich: hasRichTags(raw), math: hasMathTokens(raw) }),
    [raw],
  );
  const hasRich = flags.rich;
  const hasMath = flags.math;
  // Parse rich segments (handling <u>, <b>, etc.)
  const richSegments = useMemo(() => splitRichSegments(raw), [raw]);

  if (!raw) {
    return null;
  }

  // If there are no mathematical tokens and no rich tags, render standard Bn text
  if (!hasRich && !hasMath) {
    return (
      <Bn style={style} className={className} numberOfLines={numberOfLines}>
        {raw}
      </Bn>
    );
  }

  // Ensure KaTeX stylesheet is loaded in browser head if math is involved
  if (typeof document !== 'undefined' && hasMath) {
    if (!document.getElementById('katex-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'katex-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }

  // Render inline HTML for KaTeX & rich tags
  return (
    <Bn style={[{ whiteSpace: 'pre-wrap' } as any, style]} className={className} numberOfLines={numberOfLines}>
      {richSegments.map((rSeg, rIdx) => {
        const innerMath = hasMathTokens(rSeg.content);

        let innerContent: React.ReactNode;
        if (innerMath) {
          const mathSegs = splitTextAndMath(rSeg.content);
          innerContent = mathSegs.map((mSeg, mIdx) => {
            if (mSeg.type === 'math' && mSeg.html) {
              return (
                <span
                  key={`m-${rIdx}-${mIdx}`}
                  style={{
                    display: 'inline-block',
                    verticalAlign: 'baseline',
                    margin: '0 2px',
                  }}
                  dangerouslySetInnerHTML={{ __html: mSeg.html }}
                />
              );
            }
            return (
              <span key={`t-${rIdx}-${mIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
                {mSeg.content}
              </span>
            );
          });
        } else {
          innerContent = rSeg.content;
        }

        if (rSeg.isUnderline) {
          return (
            <u
              key={rIdx}
              style={{
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                textDecorationThickness: '2px',
                fontWeight: 600,
              }}>
              {innerContent}
            </u>
          );
        }

        if (rSeg.isBold) {
          return (
            <strong key={rIdx} style={{ fontWeight: 700 }}>
              {innerContent}
            </strong>
          );
        }

        if (rSeg.isItalic) {
          return (
            <em key={rIdx} style={{ fontStyle: 'italic' }}>
              {innerContent}
            </em>
          );
        }

        return (
          <span key={rIdx} style={{ whiteSpace: 'pre-wrap' }}>
            {innerContent}
          </span>
        );
      })}
    </Bn>
  );
});
