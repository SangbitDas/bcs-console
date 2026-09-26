import { useState, useEffect } from 'react';
import { Link, router } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';
import { CheckCircle2, Clock, User as UserIcon } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { fmtTime, toBn } from '../lib/format';
import { useExamStore } from '../store/exam';
import { usePracticeStore } from '../store/practice';
import { useAuthStore } from '../lib/auth';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { AuthModal } from './auth-modal';
import { UserAvatar } from './avatar';
import { MathText } from './math-text';
import { ExplanationImage } from './image-lightbox';
export { MathText, ExplanationImage };

/* ---------- Top bar (used as router header) ---------- */
export function TopBar() {
  const { width } = useWindowDimensions();

  // Mock Exam state
  const mockRemain = useExamStore((s) => s.remain);
  const isMockRunning = useExamStore((s) => s.running);
  const mockAnswers = useExamStore((s) => s.answers);
  const mockTotal = useExamStore((s) => s.config.count);
  const mockSubmit = useExamStore((s) => s.onSubmitExam);

  // Custom Exam state
  const isCustomRunning = usePracticeStore((s) => s.mode === 'custom' && s.started && !s.finished);
  const customRemain = usePracticeStore((s) => s.remain);
  const customTimed = usePracticeStore((s) => s.isTimed);
  const customDone = usePracticeStore((s) => s.done);
  const customTotal = usePracticeStore((s) => s.totalQuestions);
  const customSubmit = usePracticeStore((s) => s.onSubmitExam);

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const init = useAuthStore((s) => s.init);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const isExamActive = isMockRunning || isCustomRunning;
  const currentRemain = isMockRunning ? mockRemain : (customTimed ? customRemain : null);
  const currentAnswered = isMockRunning ? Object.keys(mockAnswers).length : Object.keys(customDone).length;
  const currentTotal = isMockRunning ? mockTotal : (customTotal || 0);
  const currentSubmit = isMockRunning ? mockSubmit : customSubmit;

  return (
    <View className="flex-row items-center justify-between border-b border-black/10 bg-paper px-4 sm:px-6 py-2.5 sm:py-3">
      <Pressable
        onPress={() => {
          if (isAnyExamActive()) {
            useExamGuardStore.getState().openQuitModal(() => router.push('/'));
          } else {
            router.push('/');
          }
        }}
        style={{ cursor: 'pointer' } as any}
        className="flex-row items-center">
        <Text style={{ fontFamily: FONT.displayBlack, fontSize: 18 }}>
          বিসিএস<Text style={{ color: '#EA0000', fontFamily: FONT.displayBlack }}> • </Text>কনসোল
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-2.5 sm:gap-3">
        {isExamActive ? (
          <View className="flex-row items-center gap-1.5 sm:gap-2">
            {/* Timer badge */}
            {currentRemain !== null ? (
              <View className="flex-row items-center gap-1.5 rounded-lg border border-black/15 bg-surface px-2.5 py-1.5 shadow-2xs">
                <Clock size={13} color="#EA0000" />
                <Text style={{ fontFamily: FONT.digitsBold, fontSize: 13, color: '#EA0000' }}>
                  {fmtTime(currentRemain)}
                </Text>
              </View>
            ) : null}

            {/* Answered / উত্তর সম্পন্ন badge */}
            <View
              accessibilityLabel={`উত্তর সম্পন্ন ${toBn(currentAnswered)} / ${toBn(currentTotal)}`}
              className="flex-row items-center gap-1.5 rounded-lg border border-black/15 bg-surface px-2.5 py-1.5 shadow-2xs">
              <CheckCircle2 size={13} color="#059669" />
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                {width >= 640 ? 'উত্তর সম্পন্ন:' : 'উত্তর:'}
              </Text>
              <Text style={{ fontFamily: FONT.digitsBold, fontSize: 13, color: '#0A0A0A' }}>
                {`${toBn(currentAnswered)}/${toBn(currentTotal)}`}
              </Text>
            </View>

            {/* Submit button */}
            <Pressable
              onPress={() => {
                if (currentSubmit) {
                  currentSubmit();
                }
              }}
              style={{ cursor: 'pointer' } as any}
              className="flex-row items-center gap-1.5 rounded-lg bg-[#EA0000] px-3 py-1.5 shadow-2xs transition-all hover:bg-red-700 active:scale-95">
              <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-xs font-bold" style={{ fontFamily: FONT.uiBold }}>
                জমা দিন
              </Text>
            </Pressable>
          </View>
        ) : null}

        {user ? (
          <Pressable
            onPress={() => setAuthOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="প্রোফাইল মেনু"
            className="flex-row items-center gap-2 rounded-full border border-black/15 bg-surface py-1 px-2.5 transition-all hover:border-black/35 hover:shadow-xs active:scale-95">
            <UserAvatar
              url={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
              name={profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name}
              size={24}
            />
            <Bn
              className="text-black/80 font-medium"
              style={{ fontFamily: FONT.uiSemi, fontSize: 13, maxWidth: 120 }}
              numberOfLines={1}>
              {profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'প্রোফাইল'}
            </Bn>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setAuthOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="লগইন করুন"
            className="flex-row items-center gap-1.5 rounded-full border border-black/20 bg-surface py-1.5 px-3.5 shadow-2xs transition-all hover:border-black/50 hover:shadow-xs active:scale-95">
            <UserIcon size={14} color="#0A0A0A" />
            <Bn className="text-black" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
              লগইন
            </Bn>
          </Pressable>
        )}
      </View>

      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
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
      <MathText
        className={`flex-1 ${txt}`}
        style={{ fontFamily: FONT.ui, fontSize: 16, lineHeight: 26 }}
        text={text || '—'}
      />
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
        <MathText
          className="text-black/70"
          style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 26 }}
          text={note}
        />
      ) : null}
      {(images ?? []).map((u) => (
        <ExplanationImage key={u} uri={u} title="ব্যাখ্যার চিত্র" height={260} />
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
        <ExplanationImage key={u} uri={u} title="প্রশ্নের চিত্র" height={240} className="mb-0 mt-0" />
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
