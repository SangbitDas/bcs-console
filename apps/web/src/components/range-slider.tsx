import { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, View } from 'react-native';

type Props = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

/*
 * Range slider used by the custom-exam pace picker.
 * Web keeps the native DOM `input[type=range]`; React Native cannot render an
 * `input` host component, so native gets a pointer-driven track instead.
 */
export function RangeSlider({ min, max, step = 1, value, onChange }: Props) {
  const trackWidth = useRef(0);
  const [width, setWidth] = useState(0);

  const responder = useMemo(() => {
    const commit = (x: number) => {
      const w = trackWidth.current;
      if (w <= 0 || max <= min) return;
      const ratio = Math.min(1, Math.max(0, x / w));
      const snapped = Math.round((min + ratio * (max - min)) / step) * step;
      onChange(Math.min(max, Math.max(min, snapped)));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => commit(e.nativeEvent.locationX),
      onPanResponderMove: (e) => commit(e.nativeEvent.locationX),
    });
  }, [min, max, step, onChange]);

  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: any) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.12)',
          outline: 'none',
          cursor: 'pointer',
          accentColor: '#0A0A0A',
        }}
      />
    );
  }

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const knobLeft = ratio * width - 10;

  return (
    <View {...responder.panHandlers} style={{ height: 32, justifyContent: 'center' }}>
      <View
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
        <View style={{ width: `${ratio * 100}%`, height: 6, backgroundColor: '#0A0A0A' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: knobLeft,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: '#0A0A0A',
        }}
      />
    </View>
  );
}
