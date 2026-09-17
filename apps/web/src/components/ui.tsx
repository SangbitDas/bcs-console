import { Link, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { FONT } from '../lib/fonts';
import { fmtTime, toBn } from '../lib/format';
import { useExamStore } from '../store/exam';

/* ---------- Top bar (used as router header) ---------- */
export function TopBar() {
  const pathname = usePathname();
  const remain = useExamStore((s) => s.remain);
  const running = useExamStore((s) => s.running);

  const navs = [
    { label: 'হোম', href: '/' },
    { label: 'অনুশীলন', href: '/practice' },
    { label: 'মক এক্সাম', href: '/exam' },
    { label: 'কাস্টম এক্সাম', href: '/custom' },
    { label: 'বুকমার্ক', href: '/bookmarks' },
    { label: 'ভুল প্রশ্ন', href: '/wrong' },
  ];

  return (
    <View className="flex-row items-center justify-between border-b border-black/10 bg-paper px-6 py-2.5">
      <Link href="/" asChild>
        <Pressable className="flex-row items-center gap-2">
          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 18 }}>
            বিসিএস<Text style={{ color: '#EA0000', fontFamily: FONT.displayBlack }}> • </Text>কনসোল
          </Text>
          <Text className="text-black/35" style={{ fontFamily: FONT.ui, fontSize: 11 }}>
            | 10TH-50TH BANK
          </Text>
        </Pressable>
      </Link>
      <View className="flex-row items-center gap-6">
        {running ? (
          <View className="border border-black/20 bg-surface px-3 py-1.5">
            <Text style={{ fontFamily: FONT.uiBold, fontSize: 13, color: '#EA0000' }}>
              {fmtTime(remain)}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-5">
          {navs.map((n) => {
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href as never} asChild>
                <Pressable className="relative py-2 px-1 items-center">
                  <Text
                    style={{
                      fontFamily: active ? FONT.uiBold : FONT.uiSemi,
                      fontSize: 14,
                      color: active ? '#0A0A0A' : 'rgba(0,0,0,0.65)',
                    }}>
                    {n.label}
                  </Text>
                  {active ? (
                    <View className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#EA0000] rounded-full" />
                  ) : null}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ---------- Buttons ---------- */
export function Btn({
  title,
  onPress,
  variant = 'outline',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'dark' | 'outline' | 'danger' | 'accent';
  disabled?: boolean;
}) {
  const bg =
    variant === 'dark'
      ? 'bg-ink'
      : variant === 'danger'
        ? 'border-accent'
        : variant === 'accent'
          ? 'bg-accent border-accent'
          : 'border-black';
  const fg = variant === 'outline' || variant === 'danger' ? '' : 'text-white';
  const dangerTxt = variant === 'danger' ? 'text-accent' : '';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[48px] flex-row items-center justify-center border px-5 py-3 ${bg} ${disabled ? 'opacity-40' : ''}`}>
      <Bn className={`${fg} ${dangerTxt}`} style={{ fontFamily: FONT.uiSemi, fontSize: 15 }}>
        {title}
      </Bn>
    </Pressable>
  );
}

/* ---------- Picker chip ---------- */
export function Chip({
  main,
  sub,
  active,
  dashed,
  onPress,
}: {
  main: string;
  sub?: string | number;
  active?: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[42px] flex-row items-center rounded-full border px-4 py-2 transition-all hover:border-black/35 hover:shadow-xs active:scale-[0.98] ${
        active ? 'border-black bg-ink' : 'border-black/10 bg-surface'
      } ${dashed ? 'border-dashed' : ''}`}>
      <Bn
        className={active ? 'text-white' : ''}
        style={{ fontFamily: FONT.uiBold, fontSize: 14 }}
        bold>
        {main}
      </Bn>
      {!!sub || sub === 0 ? (
        <Text
          className={active ? 'text-white/60' : 'text-black/50'}
          style={{ fontFamily: FONT.ui, fontSize: 11 }}>
          {'  '}
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

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
/* ---------- Small tag ---------- */
export function Tag({ children, warn }: { children: string; warn?: boolean }) {
  return (
    <View className={`border px-2 py-1 ${warn ? 'border-accent' : 'border-black/10'}`}>
      <Bn
        className={warn ? 'text-accent' : 'text-black/70'}
        style={{ fontFamily: FONT.uiSemi, fontSize: 11 }}>
        {children}
      </Bn>
    </View>
  );
}

/* ---------- Option button ---------- */
export type OptState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled';
export function OptBtn({
  k,
  text,
  state,
  onPress,
}: {
  k: string;
  text: string;
  state: OptState;
  onPress?: () => void;
}) {
  const box =
    state === 'selected'
      ? 'border-black bg-ink'
      : state === 'correct'
        ? 'border-ok bg-ok/10'
        : state === 'wrong'
          ? 'border-accent bg-accent/10'
          : 'border-black/10 bg-surface';
  const keyBox =
    state === 'selected'
      ? 'border-white bg-white'
      : state === 'correct'
        ? 'border-ok bg-ok'
        : state === 'wrong'
          ? 'border-accent bg-accent'
          : 'border-black/20';
  const keyTxt =
    state === 'selected' ? 'text-black' : state === 'idle' || state === 'disabled' ? '' : 'text-white';
  const txt = state === 'selected' ? 'text-white' : '';
  return (
    <Pressable
      onPress={state === 'idle' ? onPress : undefined}
      className={`min-h-[56px] flex-row items-center gap-3 border p-3 ${box} ${state === 'disabled' ? 'opacity-55' : ''}`}>
      <View className={`h-9 w-9 items-center justify-center border ${keyBox}`}>
        <Text className={keyTxt} style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
          {k}
        </Text>
      </View>
      <Bn className={`flex-1 ${txt}`} style={{ fontFamily: FONT.ui, fontSize: 16, lineHeight: 26 }}>
        {text || '—'}
      </Bn>
    </Pressable>
  );
}

/* ---------- Feedback box ---------- */
export function Feedback({
  kind,
  title,
  note,
  images,
}: {
  kind: 'ok' | 'bad' | 'info';
  title: string;
  note?: string;
  images?: string[];
}) {
  const edge = kind === 'ok' ? 'border-r-ok' : kind === 'bad' ? 'border-r-accent' : 'border-r-black/20';
  return (
    <View className={`mt-4 border border-black/10 border-r-4 bg-surface p-4 ${edge}`}>
      <Bn
        className={kind === 'ok' ? 'text-ok' : kind === 'bad' ? 'text-accent' : ''}
        style={{ fontFamily: FONT.uiBold, fontSize: 17, marginBottom: 6 }}>
        {title}
      </Bn>
      {!!note ? (
        <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 26 }}>
          {note}
        </Bn>
      ) : null}
      {(images ?? []).map((u) => (
        <View key={u} className="mt-3 border border-black/10 bg-white p-3">
          <Image source={{ uri: u }} style={{ width: '100%', height: 220 }} contentFit="contain" />
        </View>
      ))}
    </View>
  );
}

/* ---------- Question images ---------- */
export function QImages({ urls }: { urls?: string[] }) {
  if (!urls || !urls.length) return null;
  return (
    <View className="mb-4 gap-4">
      {urls.map((u) => (
        <View key={u} className="items-center border border-black/10 bg-white p-3">
          <Image source={{ uri: u }} style={{ width: '100%', height: 240 }} contentFit="contain" />
        </View>
      ))}
    </View>
  );
}

/* ---------- Section head ---------- */
export function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <View className="mb-8 border-b border-black/10 pb-8">
      <Text className="text-accent" style={{ fontFamily: FONT.uiSemi, fontSize: 14, marginBottom: 12 }}>
        {kicker}
      </Text>
      <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 30, lineHeight: 42 }}>{title}</Bn>
      {!!desc ? (
        <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 26, marginTop: 8 }}>
          {desc}
        </Bn>
      ) : null}
    </View>
  );
}

/* ---------- Exam palette ---------- */
export function Palette({
  total,
  answered,
  current,
  noAnswer,
  marked,
  onJump,
}: {
  total: number;
  answered: (i: number) => boolean;
  current: number;
  noAnswer: (i: number) => boolean;
  marked?: (i: number) => boolean;
  onJump: (i: number) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isCur = i === current;
        const isAns = answered(i);
        const isNA = noAnswer(i);
        const isMk = marked?.(i) ?? false;
        return (
          <Pressable
            key={i}
            onPress={() => onJump(i)}
            className={`h-9 w-9 items-center justify-center border ${
              isCur || isMk
                ? 'border-2 border-accent'
                : isAns
                  ? 'border-ok bg-ok'
                  : 'border-black/10 bg-surface'
            } ${isNA && !isCur && !isAns && !isMk ? 'opacity-60' : ''}`}>
            <Text
              className={isAns && !isCur && !isMk ? 'text-white' : isMk || isCur ? 'text-accent' : ''}
              style={{ fontFamily: FONT.digits, fontSize: 11 }}>
              {toBn(i + 1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Timer bar ---------- */
export function TimerBar({
  exam,
  marks,
  remain,
  answered,
  total,
}: {
  exam: string;
  marks: string;
  remain: number;
  answered: number;
  total: number;
}) {
  const warn = remain <= 600;
  return (
    <View className={`flex-row flex-wrap items-center justify-between gap-2 px-5 py-3 ${warn ? 'bg-accent' : 'bg-ink'}`}>
      <Bn className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
        {`${exam} · ${marks}`}
      </Bn>
      <View className="flex-row items-baseline gap-1.5">
        <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 17 }}>
          {fmtTime(remain)}
        </Text>
        <Text className="text-white/80" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
          অবশিষ্ট
        </Text>
      </View>
      <Bn className="text-white/85" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
        {`উত্তর: ${toBn(answered)}/${toBn(total)}`}
      </Bn>
    </View>
  );
}

/* ---------- Score panel ---------- */
export function ScorePanel({ right, wrong }: { right: number; wrong: number }) {
  const n = Math.max(1, right + wrong);
  return (
    <View className="border border-black/10 bg-surface p-5">
      <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 14, marginBottom: 12 }}>
        স্কোর
      </Text>
      <View className="mb-1 flex-row justify-between">
        <Text style={{ fontFamily: FONT.ui, fontSize: 14 }}>সঠিক</Text>
        <Text style={{ fontFamily: FONT.digits, fontSize: 14 }}>{toBn(right)}</Text>
      </View>
      <View className="mb-3 h-2 bg-black/10">
        <View className="h-2 bg-ok" style={{ width: `${(right / n) * 100}%` }} />
      </View>
      <View className="mb-1 flex-row justify-between">
        <Text style={{ fontFamily: FONT.ui, fontSize: 14 }}>ভুল / দেখা</Text>
        <Text style={{ fontFamily: FONT.digits, fontSize: 14 }}>{toBn(wrong)}</Text>
      </View>
      <View className="h-2 bg-black/10">
        <View className="h-2 bg-accent" style={{ width: `${(wrong / n) * 100}%` }} />
      </View>
    </View>
  );
}
