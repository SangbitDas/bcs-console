import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { FONT } from '../lib/fonts';

/* ---------- Bangla text: rendered in Noto Sans Bengali ---------- */
export function Bn({
  children,
  style,
  className,
  bold,
  numberOfLines,
}: {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  className?: string;
  bold?: boolean;
  numberOfLines?: number;
}) {
  if (children === undefined || children === null) return null;

  const flatStyle = (StyleSheet.flatten(style) || {}) as TextStyle;
  const baseFont = flatStyle.fontFamily || (bold ? FONT.uiBold : FONT.ui);
  /* Bengali digit runs must always render in Noto Sans Bengali, even if a caller
     passes a non-Bengali font for surrounding Latin text. */
  const baseFam = flatStyle.fontFamily ? String(flatStyle.fontFamily) : '';
  const digitFont = bold
    ? FONT.digitsBold
    : baseFam.startsWith('NotoSansBengali')
      ? baseFam
      : FONT.digitsReg;

  if (typeof children === 'string' || typeof children === 'number') {
    const parts = String(children).split(/([০-৯]+)/g);
    if (parts.length === 1 && !/^[০-৯]+$/.test(parts[0])) {
      return (
        <Text
          numberOfLines={numberOfLines}
          style={[{ fontFamily: baseFont }, style]}
          className={className}>
          {children}
        </Text>
      );
    }
    return (
      <Text
        numberOfLines={numberOfLines}
        style={[{ fontFamily: baseFont }, style]}
        className={className}>
        {parts.map((p, i) =>
          /^[০-৯]+$/.test(p) ? (
            <Text
              key={i}
              style={{
                fontFamily: digitFont,
              }}>
              {p}
            </Text>
          ) : (
            <Text
              key={i}
              style={{
                fontFamily: baseFont,
              }}>
              {p}
            </Text>
          ),
        )}
      </Text>
    );
  }

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: baseFont }, style]}
      className={className}>
      {children}
    </Text>
  );
}
