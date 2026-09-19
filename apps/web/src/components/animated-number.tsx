import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../lib/fonts';
import { toBn } from '../lib/format';

export function AnimatedStatNumber({
  value,
  suffix = 'টি',
  duration = 1400,
  delay = 0,
  hasComma = false,
  fontSize = 28,
  lineHeight = 34,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  delay?: number;
  hasComma?: boolean;
  fontSize?: number;
  lineHeight?: number;
}) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrame: number;
    let timer: ReturnType<typeof setTimeout>;

    timer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easeOutQuart deceleration
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(ease * value);
        setDisplayVal(current);

        if (progress < 1) {
          animFrame = requestAnimationFrame(step);
        } else {
          setDisplayVal(value);
        }
      };

      animFrame = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [value, duration, delay]);

  const formattedStr = hasComma
    ? displayVal.toLocaleString('en-US')
    : String(displayVal);

  return (
    <View className="flex-row items-baseline">
      <Text
        style={{
          fontFamily: FONT.displayBlack,
          fontSize,
          lineHeight,
          fontVariant: ['tabular-nums'],
          color: '#0A0A0A',
        }}>
        {toBn(formattedStr)}
      </Text>
      {suffix ? (
        <Text
          style={{
            fontFamily: FONT.displayBlack,
            fontSize: Math.round(fontSize * 0.78),
            lineHeight,
            color: '#0A0A0A',
            marginLeft: 2,
          }}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}
