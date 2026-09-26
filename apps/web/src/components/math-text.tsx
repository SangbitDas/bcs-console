import React, { useMemo } from 'react';
import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import { Bn } from './bn';
import { hasMathTokens, latexToReadableText, splitTextAndMath, type TextSegment } from '../lib/mathParser';

export interface MathTextProps {
  text?: string | null;
  style?: StyleProp<TextStyle>;
  className?: string;
  numberOfLines?: number;
}

interface FormattedSegment {
  content: string;
  isUnderline?: boolean;
  isBold?: boolean;
  isItalic?: boolean;
}

const RICH_TAG_REGEX = /(<\/?(?:u|b|i|strong|em)>)/i;

function parseRichSegments(text: string): FormattedSegment[] {
  const parts = text.split(RICH_TAG_REGEX);
  const segments: FormattedSegment[] = [];

  let isUnderline = false;
  let isBold = false;
  let isItalic = false;

  for (const part of parts) {
    if (!part) continue;

    const lower = part.toLowerCase();
    if (lower === '<u>') {
      isUnderline = true;
    } else if (lower === '</u>') {
      isUnderline = false;
    } else if (lower === '<b>' || lower === '<strong>') {
      isBold = true;
    } else if (lower === '</b>' || lower === '</strong>') {
      isBold = false;
    } else if (lower === '<i>' || lower === '<em>') {
      isItalic = true;
    } else if (lower === '</i>' || lower === '</em>') {
      isItalic = false;
    } else {
      segments.push({
        content: part,
        isUnderline,
        isBold,
        isItalic,
      });
    }
  }

  return segments;
}

/**
 * MathText Component
 *
 * Intelligently renders questions, options, and solve notes.
 * - For plain non-math, non-formatted text: Passes through directly to `<Bn>` for zero overhead.
 * - For rich formatted text: Renders clean, accessible underlines (<u>), bold (<b>), italics (<i>).
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

  const hasRich = RICH_TAG_REGEX.test(text);
  const hasMath = hasMathTokens(text);

  // If there are no mathematical tokens and no rich tags, render standard Bn text
  if (!hasRich && !hasMath) {
    return (
      <Bn style={style} className={className} numberOfLines={numberOfLines}>
        {text}
      </Bn>
    );
  }

  // Ensure KaTeX stylesheet is loaded in browser head if math is involved
  if (Platform.OS === 'web' && typeof document !== 'undefined' && hasMath) {
    if (!document.getElementById('katex-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'katex-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }

  // Parse rich segments (handling <u>, <b>, etc.)
  const richSegments = useMemo(() => parseRichSegments(text), [text]);

  // Native math fallback: KaTeX needs the DOM, so convert math tokens to readable
  // Unicode text instead (web keeps rendering real KaTeX HTML).
  const nativeMath = useMemo(
    () =>
      Platform.OS === 'web'
        ? null
        : richSegments.map((seg) =>
            seg.content && hasMathTokens(seg.content)
              ? splitTextAndMath(seg.content, { html: false })
              : null,
          ),
    [richSegments],
  );

  // If running on Web, render inline HTML for KaTeX & rich tags
  if (Platform.OS === 'web') {
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
  }

  // Mobile / Native fallback (no DOM/KaTeX available)
  return (
    <Bn style={style} className={className} numberOfLines={numberOfLines}>
      {richSegments.map((rSeg, rIdx) => {
        const textStyle: TextStyle = {};
        if (rSeg.isUnderline) {
          textStyle.textDecorationLine = 'underline';
          textStyle.fontWeight = 'bold';
        }
        if (rSeg.isBold) {
          textStyle.fontWeight = 'bold';
        }
        if (rSeg.isItalic) {
          textStyle.fontStyle = 'italic';
        }

        const mathSegs = nativeMath?.[rIdx];
        const content = mathSegs
          ? mathSegs.map((mSeg) =>
              mSeg.type === 'math' ? latexToReadableText(mSeg.content) : mSeg.content,
            )
          : rSeg.content;

        return (
          <Text key={rIdx} style={textStyle}>
            {content}
          </Text>
        );
      })}
    </Bn>
  );
});
