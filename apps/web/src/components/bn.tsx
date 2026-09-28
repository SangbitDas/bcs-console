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

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: baseFont }, style]}
      className={className}>
      {children}
    </Text>
  );
}

