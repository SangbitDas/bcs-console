import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { InlineTeX } from './ratex-native';
import { Bn } from './bn';
import { FONT } from '../lib/fonts';
import {
  convertPlainMathToLatex,
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
 * - For Web (DOM): Renders high-fidelity KaTeX equations inline.
 * - For Native (Mobile): Renders hardware-accelerated, zero-overhead Vector SVG Math (`<SvgXml>`)
 *   powered by native GPU canvas (Skia/Android graphics) for fluid 120 FPS scrolling.
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

  // Native math segments
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
  // Memoized native inline strings per rich segment (avoids re-running the
  // tokenizer + LaTeX converter on every parent re-render).
  const nativeInlineStrings = useMemo(
    () =>
      nativeMath?.map((mathSegs) => {
        if (!mathSegs) return null;
        return mathSegs
          .map((mSeg) => {
            if (mSeg.type === 'math') {
              const latex = convertPlainMathToLatex(mSeg.content);
              return `$${latex}$`;
            }
            return mSeg.content;
          })
          .join('');
      }) ?? null,
    [nativeMath],
  );
  // Memoized pure-math inline string for the no-rich-tags native path.
  const pureMathInline = useMemo(() => {
    if (Platform.OS === 'web' || hasRich || !hasMath || !raw) return null;
    const mathSegs = splitTextAndMath(raw, { html: false });
    return mathSegs
      .map((mSeg) => {
        if (mSeg.type === 'math') {
          const latex = convertPlainMathToLatex(mSeg.content);
          return `$${latex}$`;
        }
        return mSeg.content;
      })
      .join('');
  }, [raw, hasRich, hasMath]);

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

  // Ensure KaTeX stylesheet is loaded in browser head if math is involved on Web
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

  // Mobile / Native: Hardware-accelerated Math
  const flatStyle = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontSize = typeof flatStyle.fontSize === 'number' ? flatStyle.fontSize : 15;
  const textColor = typeof flatStyle.color === 'string' ? flatStyle.color : '#0A0A0A';
  const computedLineHeight =
    typeof flatStyle.lineHeight === 'number'
      ? Math.max(flatStyle.lineHeight, Math.round(fontSize * 1.85))
      : Math.round(fontSize * 1.85);

  // Direct InlineTeX rendering for pure math or mixed prose with no HTML tags.
  if (!hasRich && hasMath && pureMathInline != null) {
    const inlineString = pureMathInline;
    const textStyle: TextStyle = {
      fontSize,
      lineHeight: computedLineHeight,
      color: textColor,
      fontFamily: FONT.ui,
    };

    return (
      <View style={{ width: '100%', flexDirection: 'row' }}>
        <InlineTeX
          content={inlineString}
          fontSize={fontSize}
          color={textColor}
          textStyle={textStyle}
          style={[{ width: '100%', flexShrink: 1 }, style as any]}
        />
      </View>
    );
  }

  return (
    <Bn
      style={[{ lineHeight: computedLineHeight, color: textColor } as any, style]}
      className={className}
      numberOfLines={numberOfLines}>
      {richSegments.map((rSeg, rIdx) => {
        const textStyle: TextStyle = {
          fontSize,
          lineHeight: computedLineHeight,
          color: textColor,
        };
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
        const inlineString = nativeInlineStrings?.[rIdx];
        if (mathSegs && inlineString != null) {
          // Noto Sans Bengali must be explicitly passed down to Native text spans
          textStyle.fontFamily = textStyle.fontWeight === 'bold' ? FONT.uiBold : FONT.ui;

          return (
            <View key={rIdx} style={{ width: '100%', flexDirection: 'row' }}>
              <InlineTeX
                content={inlineString}
                fontSize={fontSize}
                color={textColor}
                textStyle={textStyle}
                style={{ width: '100%', flexShrink: 1 }}
              />
            </View>
          );
        }

        return (
          <Text key={rIdx} style={textStyle}>
            {rSeg.content}
          </Text>
        );
      })}
    </Bn>
  );
});

