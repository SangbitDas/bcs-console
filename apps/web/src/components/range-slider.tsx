type Props = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

/* Range slider used by the custom-exam pace picker (DOM input). */
export function RangeSlider({ min, max, step = 1, value, onChange }: Props) {
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
