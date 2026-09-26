import { Link, router } from 'expo-router';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Flag,
  Home,
  Info,
  Minus,
  Pin,
  type LucideIcon,
} from 'lucide-react-native';
import { Children, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { FONT } from '../lib/fonts';
import { examLabel, examNum, toBn } from '../lib/format';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { Bn } from './ui';

/* ---------- Breadcrumb ---------- */
export interface Crumb {
  label: string;
  href?: string;
  onPress?: () => void;
  icon?: ReactNode;
}

export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <View className="mb-4 flex-row flex-wrap items-center gap-2">
      {trail.map((c, i) => {
        const last = i === trail.length - 1;
        const isHome = c.label === 'হোম' || c.href === '/';

        const content = (
          <View className="flex-row items-center gap-1.5">
            {c.icon ? (
              c.icon
            ) : isHome ? (
              <Home size={13.5} color={last ? '#0A0A0A' : 'rgba(0,0,0,0.5)'} strokeWidth={2} />
            ) : null}
            <Text
              className={last ? 'text-black/85 font-medium' : 'text-black/50 hover:text-black/80 transition-colors'}
              style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              {c.label}
            </Text>
          </View>
        );

        const handlePress = () => {
          if (c.onPress) {
            c.onPress();
          } else if (c.href) {
            if (isAnyExamActive()) {
              useExamGuardStore.getState().openQuitModal(() => router.push(c.href as any));
            } else {
              router.push(c.href as any);
            }
          }
        };

        const node =
          last || (!c.href && !c.onPress) ? (
            <View key={c.label}>
              {content}
            </View>
          ) : (
            <Pressable
              key={c.label}
              onPress={handlePress}
              style={{ cursor: 'pointer' } as any}
              className="active:opacity-75">
              {content}
            </Pressable>
          );

        return (
          <View key={`${c.label}-${i}`} className="flex-row items-center gap-2">
            {i > 0 ? <Text className="text-black/30" style={{ fontSize: 13 }}>›</Text> : null}
            {node}
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Radio Pill Option (mock source) ---------- */
export function RadioPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`min-h-[40px] flex-row items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors ${
        selected ? 'border-black bg-black/[0.04]' : 'border-black/20 bg-surface'
      }`}>
      <View
        className={`h-4 w-4 items-center justify-center rounded-full border ${
          selected ? 'border-black' : 'border-black/40'
        }`}>
        {selected ? <View className="h-2 w-2 rounded-full bg-black" /> : null}
      </View>
      <Bn
        className={selected ? 'text-black' : 'text-black/75'}
        style={{ fontFamily: selected ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
        {label}
      </Bn>
    </Pressable>
  );
}

/* ---------- Radio Circle Option (mock order / options) ---------- */
export function RadioCircleOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-row items-center gap-2.5 py-1">
      <View
        className={`h-4 w-4 items-center justify-center rounded-full border ${
          selected ? 'border-black' : 'border-black/40'
        }`}>
        {selected ? <View className="h-2 w-2 rounded-full bg-black" /> : null}
      </View>
      <Bn
        className={selected ? 'text-black' : 'text-black/80'}
        style={{ fontFamily: selected ? FONT.uiBold : FONT.uiSemi, fontSize: 14 }}>
        {label}
      </Bn>
    </Pressable>
  );
}

/* ---------- Dropdown Select ---------- */
export function DropdownSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  label,
  maxHeight = 260,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  label?: string;
  maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = label ?? selectedOption?.label ?? placeholder ?? String(value);

  return (
    <View style={{ position: 'relative', zIndex: open ? 9999 : 1 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        className="min-h-[44px] flex-row items-center justify-between rounded-md border border-black/20 bg-surface px-3.5 py-2">
        <Bn style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>{displayLabel}</Bn>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#0A0A0A" />
        </View>
      </Pressable>
      {open ? (
        <>
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: 'fixed' as any,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
            }}
          />
          <View
            className="absolute left-0 right-0 top-[48px] rounded-md border border-black/20 bg-surface shadow-2xl"
            style={{ zIndex: 9999, elevation: 25 }}>
            <ScrollView style={{ maxHeight }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`min-h-[42px] flex-row items-center justify-between border-b border-black/5 px-3.5 py-2.5 hover:bg-black/[0.03] ${
                      active ? 'bg-black/[0.05]' : ''
                    }`}>
                    <Bn
                      className={active ? 'text-black font-semibold' : 'text-black/80'}
                      style={{ fontFamily: active ? FONT.uiBold : FONT.uiSemi, fontSize: 14 }}>
                      {o.label}
                    </Bn>
                    {active ? <Check size={16} color="#0A0A0A" strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

/* ---------- Segmented control (radio replacement) ---------- */
export function SegControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={`min-h-[48px] flex-row items-center gap-2 rounded-full border px-4 ${
              active ? 'border-black bg-ink' : 'border-black/10 bg-surface'
            }`}>
            {Icon ? <Icon size={16} color={active ? '#fff' : '#0A0A0A'} /> : null}
            <Bn className={active ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
              {o.label}
            </Bn>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Hub mode card (practice hub) ---------- */
export function ModeCard({
  icon: Icon,
  title,
  desc,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[160px] flex-1 basis-[46%] justify-between rounded-xl border border-black/10 bg-surface p-5 transition-colors active:bg-black/[0.02]"
      style={{ minWidth: 150 }}>
      <View>
        <View className="mb-3">
          <Icon size={24} color="#0A0A0A" strokeWidth={1.8} />
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 17, marginBottom: 4 }}>{title}</Bn>
        <Bn className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 20 }}>
          {desc}
        </Bn>
      </View>
      <View className="flex-row justify-end pt-2">
        <ArrowRight size={18} color="#0A0A0A" />
      </View>
    </Pressable>
  );
}

/* ---------- Summary sidebar ---------- */
export function SummaryCard({
  rows,
  cta,
  onCta,
  disabled,
  hideCtaOnMobile = false,
}: {
  rows: [string, string][];
  cta?: string;
  onCta?: () => void;
  disabled?: boolean;
  hideCtaOnMobile?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const showCta = Boolean(cta && onCta && (!hideCtaOnMobile || isWide));

  return (
    <View className="gap-4 border border-black/10 bg-surface p-5">
      <View>
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 12 }}>আপনার নির্বাচিত সেট</Text>
        {rows.map(([l, v]) => (
          <View key={l} className="mb-3 border-b border-black/10 pb-3">
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12, marginBottom: 2 }}>{l}</Text>
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>{v}</Bn>
          </View>
        ))}
      </View>
      {showCta ? (
        <Pressable
          onPress={onCta}
          disabled={disabled}
          className={`min-h-[48px] flex-row items-center justify-center gap-2 bg-ink px-5 ${disabled ? 'opacity-40' : ''}`}>
          <Text className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 15 }}>{cta}</Text>
          <ArrowRight size={17} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Notes card ---------- */
export function NotesCard({ items, title = 'লক্ষণীয়' }: { items: string[]; title?: string }) {
  return (
    <View className="gap-2 border border-black/10 bg-surface p-5">
      <View className="mb-1 flex-row items-center gap-2">
        <Info size={16} color="#0A0A0A" />
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>{title}</Text>
      </View>
      {items.map((t) => (
        <View key={t} className="flex-row gap-2">
          <Text className="text-black/50" style={{ fontSize: 14 }}>•</Text>
          <Bn className="flex-1 text-black/70" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 20 }}>{t}</Bn>
        </View>
      ))}
    </View>
  );
}

/* ---------- Bookmark toggle ---------- */
export function BookmarkBtn({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel="বুকমার্ক"
      className="h-[44px] w-[44px] items-center justify-center border border-black/10 bg-surface">
      <Bookmark size={19} color={active ? '#EA0000' : '#0A0A0A'} fill={active ? '#EA0000' : 'none'} />
    </Pressable>
  );
}

/* ---------- Mark for review toggle ---------- */
export function ReviewToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center gap-2 border px-3 ${active ? 'border-accent bg-accent/10' : 'border-black/10 bg-surface'}`}>
      <Flag size={16} color={active ? '#EA0000' : '#0A0A0A'} fill={active ? '#EA0000' : 'none'} />
      <Text className={active ? 'text-accent' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
        {active ? 'রিভিউ চিহ্নিত' : 'রিভিউ করুন'}
      </Text>
    </Pressable>
  );
}

/* ---------- Thin progress bar ---------- */
export function ProgressBar({ pct, color = 'bg-accent' }: { pct: number; color?: string }) {
  return (
    <View className="h-1 bg-black/10">
      <View className={`h-1 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </View>
  );
}

/* ---------- Verdict line ---------- */
export function Verdict({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={20} color={ok ? '#0A7A3D' : '#EA0000'} />
      <Text className={ok ? 'text-ok' : 'text-accent'} style={{ fontFamily: FONT.uiBold, fontSize: 17 }}>
        {text}
      </Text>
    </View>
  );
}

/* ---------- Check row ---------- */
export function CheckRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Check size={16} color="#0A7A3D" />
      <Text className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

/* ---------- Chevron link row ---------- */
export function GoRow({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 border-b border-black/10 bg-surface py-4">
      <View className="flex-1">
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>{title}</Bn>
        <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>{sub}</Bn>
      </View>
      <ChevronRight size={20} color="#0A0A0A" />
    </Pressable>
  );
}

const RANGE_PRESETS: { label: string; from: number; to: number }[] = [
  { label: 'সব (১০–৫০)', from: 10, to: 50 },
  { label: 'সাম্প্রতিক (৪৬–৫০)', from: 46, to: 50 },
  { label: '৪১–৫০', from: 41, to: 50 },
  { label: '৩৬–৫০', from: 36, to: 50 },
  { label: '৩১–৫০', from: 31, to: 50 },
  { label: '২১–৫০', from: 21, to: 50 },
];

const ERAS = [
  { label: 'সাম্প্রতিক', from: 46, to: 50 },
  { label: '৪০-এর দশক', from: 41, to: 45 },
  { label: '৩০-এর দশক', from: 31, to: 40 },
  { label: '২০-এর দশক', from: 21, to: 30 },
  { label: 'শুরুর দিকের', from: 10, to: 20 },
];

/* ---------- BCS range picker (preset chips + custom from/to) ---------- */
export function RangePicker({
  fromN,
  toN,
  onChange,
}: {
  fromN: number;
  toN: number;
  onChange: (from: number, to: number) => void;
}) {
  const nums = Array.from({ length: 41 }, (_, i) => 50 - i);
  const isCustom = !RANGE_PRESETS.some((p) => p.from === fromN && p.to === toN);
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {RANGE_PRESETS.map((p) => {
          const active = !isCustom && p.from === fromN && p.to === toN;
          return (
            <Pressable
              key={p.label}
              onPress={() => onChange(p.from, p.to)}
              className={`min-h-[44px] items-center justify-center rounded-full border px-4 ${active ? 'border-black bg-ink' : 'border-black/10 bg-surface'}`}>
              <Bn className={active ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                {p.label}
              </Bn>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(46, 50)}
          className={`min-h-[44px] items-center justify-center rounded-full border border-dashed px-4 ${isCustom ? 'border-black bg-ink' : 'border-black/10 bg-surface'}`}>
          <Bn className={isCustom ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
            {`কাস্টম: ${toBn(fromN)}–${toBn(toN)}`}
          </Bn>
        </Pressable>
      </View>
      {isCustom ? (
        <View className="gap-3 border border-black/10 bg-surface p-4">
          {(
            [
              ['থেকে', fromN, (n: number) => onChange(Math.min(n, toN), Math.max(n, toN))],
              ['পর্যন্ত', toN, (n: number) => onChange(Math.min(fromN, n), Math.max(fromN, n))],
            ] as const
          ).map(([label, val, set]) => (
            <View key={label}>
              <Bn className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 13, marginBottom: 8 }}>
                {`${label}: ${toBn(val)}তম`}
              </Bn>
              <View className="flex-row flex-wrap gap-1.5">
                {nums.map((n) => (
                  <Pressable
                    key={`${label}-${n}`}
                    onPress={() => set(n)}
                    className={`h-10 min-w-[44px] items-center justify-center rounded-full border px-2 ${n === val ? 'border-black bg-ink' : 'border-black/10 bg-paper'}`}>
                    <Bn className={n === val ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                      {toBn(n)}
                    </Bn>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Count picker ---------- */
export function CountPicker({
  value,
  onChange,
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number;
}) {
  const opts = [10, 20, 30, 50, 100, 200].filter((c) => !max || c <= max);
  return (
    <View className="flex-row flex-wrap gap-2">
      {opts.map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(active ? null : c)}
            className={`min-h-[44px] items-center justify-center rounded-full border px-4 ${active ? 'border-black bg-ink' : 'border-black/10 bg-surface'}`}>
            <Bn className={active ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
              {`${toBn(c)}টি`}
            </Bn>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onChange(null)}
        className={`min-h-[44px] items-center justify-center rounded-full border border-dashed px-4 ${value === null ? 'border-black bg-ink' : 'border-black/10 bg-surface'}`}>
        <Text className={value === null ? 'text-white' : ''} style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
          সবগুলো
        </Text>
      </Pressable>
    </View>
  );
}

/* ---------- Recent session row (compact) ---------- */
export function RecentRow({
  label,
  sub,
  pct,
  onPress,
}: {
  label: string;
  sub: string;
  pct: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="border-b border-black/10 bg-surface py-4">
      <View className="mb-1 flex-row items-center justify-between gap-2">
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>{label}</Bn>
        <Bn className="text-black/50" style={{ fontFamily: FONT.digits, fontSize: 12 }}>{`${toBn(Math.round(pct))}%`}</Bn>
      </View>
      <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 8 }}>{sub}</Bn>
      <ProgressBar pct={pct} />
    </Pressable>
  );
}

/* ---------- Recent practice row (matches Image 1) ---------- */
export function RecentPracticeRow({
  title,
  sub,
  scoreText,
  pctText,
  pct,
  dateText,
  actionText,
  onPress,
}: {
  title: string;
  sub: string;
  scoreText: string;
  pctText: string;
  pct: number;
  dateText?: string;
  actionText?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-black/5 bg-surface px-5 py-4 transition-colors hover:bg-black/[0.015] active:bg-black/[0.03]">
      <View className="flex-1 pr-4">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>{title}</Bn>
            {dateText ? (
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: '#0A0A0A' }}>
                • {dateText}
              </Bn>
            ) : null}
          </View>
          <Bn style={{ fontFamily: FONT.digitsBold, fontSize: 15 }}>{scoreText}</Bn>
        </View>
        <View className="mb-2.5 flex-row items-center justify-between">
          <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>{sub}</Bn>
          <View className="flex-row items-center gap-2">
            <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>{pctText}</Bn>
            {actionText ? (
              <Bn className="text-[#EA0000] text-xs font-semibold" style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>
                • {actionText}
              </Bn>
            ) : null}
          </View>
        </View>
        <View className="h-1 w-full overflow-hidden rounded-full bg-black/10">
          <View
            className="h-1 rounded-full bg-[#EA0000]"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </View>
      </View>
      <ChevronRight size={18} color="rgba(0,0,0,0.3)" />
    </Pressable>
  );
}

/* ---------- Recent Practice Grid Card (Grid by Grid View) ---------- */
export function RecentPracticeCard({
  title,
  sub,
  scoreText,
  pctText,
  pct,
  dateText,
  actionText,
  onPress,
  pinned,
  onTogglePin,
  fullWidth,
}: {
  title: string;
  sub: string;
  scoreText: string;
  pctText: string;
  pct: number;
  dateText?: string;
  actionText?: string;
  onPress: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`group min-h-[148px] ${fullWidth ? 'w-full' : 'flex-1 basis-[280px]'} justify-between rounded-xl border border-black/10 bg-surface p-4 shadow-xs transition-all hover:border-black/30 hover:shadow-sm active:scale-[0.99] active:bg-black/[0.02]`}>
      {/* Top: Title & Date Badge in visible bold black font */}
      <View>
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 pr-1">
            <Bn
              style={{ fontFamily: FONT.uiBold, fontSize: 15.5, color: '#0A0A0A', lineHeight: 22 }}
              numberOfLines={2}>
              {title}
            </Bn>
            <Bn
              className="mt-0.5 text-black/60"
              style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>
              {sub}
            </Bn>
          </View>

          <View className="flex-row items-center gap-1.5">
            {dateText ? (
              <View className="rounded-md border border-black/15 bg-black/[0.05] px-2.5 py-1">
                <Bn
                  style={{
                    fontFamily: FONT.uiBold,
                    fontSize: 12,
                    color: '#0A0A0A',
                  }}>
                  {dateText}
                </Bn>
              </View>
            ) : null}

            {onTogglePin ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                }}
                accessibilityLabel={pinned ? 'আনপিন করুন' : 'পিন করুন'}
                className={`h-7 w-7 items-center justify-center rounded-md border transition-colors active:bg-black/[0.08] ${
                  pinned ? 'border-[#EA0000] bg-[#EA0000]/10' : 'border-black/15 bg-black/[0.04]'
                }`}>
                <Pin
                  size={14}
                  color={pinned ? '#EA0000' : 'rgba(0,0,0,0.45)'}
                  fill={pinned ? '#EA0000' : 'none'}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Middle & Bottom: Score, Progress, and Action button */}
      <View className="mt-3.5">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Bn
            className="text-black/70"
            style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            {pctText}
          </Bn>
          <Bn
            style={{
              fontFamily: FONT.digitsBold,
              fontSize: 14.5,
              color: '#0A0A0A',
            }}>
            {scoreText}
          </Bn>
        </View>

        {/* Progress bar */}
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <View
            className="h-1.5 rounded-full bg-[#EA0000]"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </View>

        {/* Action button */}
        <View className="mt-3 flex-row items-center justify-between border-t border-black/5 pt-2">
          <Bn
            className="text-[#EA0000] font-bold"
            style={{ fontFamily: FONT.uiBold, fontSize: 12.5 }}>
            {actionText || 'চালিয়ে যান →'}
          </Bn>
          <ChevronRight size={15} color="#EA0000" />
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- Quote card (matches Image 1 bottom) ---------- */
export function QuoteCard({
  quote = 'প্রতিদিন একটু একটু করে এগিয়ে যাওয়াই সাফল্যের মূল চাবিকাঠি।',
  author = 'বিসিএস কনসোল',
}: {
  quote?: string;
  author?: string;
}) {
  return (
    <View className="items-center justify-center px-4 py-8">
      <Text
        className="mb-1 text-center text-black/60"
        style={{ fontFamily: FONT.ui, fontSize: 14 }}>
        “{quote}”
      </Text>
      <Text className="text-black/40" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
        — {author}
      </Text>
    </View>
  );
}

/* ---------- Responsive columns: fill the row, wrap when narrow ---------- */
export function Cols({
  children,
  min = 260,
  weights,
  gap = 12,
}: {
  children: ReactNode;
  min?: number;
  weights?: number[];
  gap?: number;
}) {
  const arr = Children.toArray(children).filter(Boolean);
  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {arr.map((c, i) => (
        <View
          key={i}
          style={{ flexGrow: weights?.[i] ?? 1, flexShrink: 1, flexBasis: min, minWidth: min }}>
          {c}
        </View>
      ))}
    </View>
  );
}

/* ---------- Sidebar layout (desktop: side-by-side, mobile: stacked) ---------- */
export function SidebarLayout({
  sidebar,
  children,
  sidebarWidth = 280,
  reverseOnMobile = false,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: number;
  reverseOnMobile?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  if (!isWide) {
    return (
      <View className="gap-6" style={{ overflow: 'visible' }}>
        {reverseOnMobile ? (
          <>
            <View style={{ position: 'relative', zIndex: 20, overflow: 'visible' }}>{children}</View>
            <View style={{ position: 'relative', zIndex: 1 }}>{sidebar}</View>
          </>
        ) : (
          <>
            <View style={{ position: 'relative', zIndex: 1 }}>{sidebar}</View>
            <View style={{ position: 'relative', zIndex: 20, overflow: 'visible' }}>{children}</View>
          </>
        )}
      </View>
    );
  }

  return (
    <View className="flex-row gap-6" style={{ alignItems: 'flex-start' }}>
      <View style={{ width: sidebarWidth, flexShrink: 0 }}>
        {sidebar}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {children}
      </View>
    </View>
  );
}

/* ---------- Sidebar nav item ---------- */
export function SidebarNavItem({
  icon: Icon,
  title,
  desc,
  active,
  onPress,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  active?: boolean;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-lg px-3.5 py-3 transition-colors ${
        active ? 'bg-black/[0.06]' : 'bg-transparent'
      }`}
      style={active ? { borderLeftWidth: 3, borderLeftColor: '#EA0000' } : undefined}>
      <View className={`h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-[#EA0000]/10' : 'bg-black/[0.04]'}`}>
        <Icon size={16} color={active ? '#EA0000' : '#0A0A0A'} strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Bn
          style={{
            fontFamily: active ? FONT.uiBold : FONT.uiSemi,
            fontSize: 14,
            color: active ? '#0A0A0A' : 'rgba(0,0,0,0.75)',
          }}>
          {title}
        </Bn>
        {desc ? (
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            {desc}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View className="rounded-full bg-black/[0.06] px-2 py-0.5">
          <Bn className="text-black/60" style={{ fontFamily: FONT.digits, fontSize: 11 }}>{badge}</Bn>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ---------- Uniform grid: all children same size ---------- */
export function UniformGrid({
  children,
  minWidth = 200,
  gap = 12,
}: {
  children: ReactNode;
  minWidth?: number;
  gap?: number;
}) {
  const arr = Children.toArray(children).filter(Boolean);
  const { width: screenWidth } = useWindowDimensions();
  /* compute columns based on available width */
  const cols = Math.max(1, Math.floor((screenWidth - 40) / (minWidth + gap)));
  const pct = `${100 / cols}%`;

  return (
    <View className="flex-row flex-wrap" style={{ gap, marginRight: -gap }}>
      {arr.map((c, i) => (
        <View
          key={i}
          style={{
            width: pct as any,
            maxWidth: pct as any,
            flexGrow: 0,
            flexShrink: 0,
            paddingRight: gap,
            boxSizing: 'border-box' as any,
          }}>
          {c}
        </View>
      ))}
    </View>
  );
}

/* ---------- Generic bordered card ---------- */
export function Card({
  title,
  desc,
  children,
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <View className="border border-black/10 bg-surface p-5">
      {!!title ? (
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: desc ? 4 : 12 }}>{title}</Bn>
      ) : null}
      {!!desc ? (
        <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
          {desc}
        </Bn>
      ) : null}
      {children}
    </View>
  );
}

/* ---------- Free multi-exam picker (dropdown with tick boxes) ---------- */
const DROP_ERAS = [
  { label: 'সাম্প্রতিক', from: 46, to: 50 },
  { label: '৪১–৪৫তম', from: 41, to: 45 },
  { label: '৩১–৪০তম', from: 31, to: 40 },
  { label: '২১–৩০তম', from: 21, to: 30 },
  { label: '১০–২০তম', from: 10, to: 20 },
];

export function ExamMultiPicker({
  exams,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  exams: { slug: string; total_questions: number }[];
  selected: string[];
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ zIndex: 20 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        className="min-h-[44px] flex-row items-center justify-between rounded-md border border-black/20 bg-surface px-3.5 py-2">
        <Bn style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
          {selected.length ? `${toBn(selected.length)}টি পরীক্ষা নির্বাচিত` : `সব (${toBn(exams.length)}টি)`}
        </Bn>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#0A0A0A" />
        </View>
      </Pressable>
      {open ? (
        <View className="border border-t-0 border-black/20 bg-surface">
          <View className="flex-row flex-wrap gap-2 border-b border-black/10 p-3">
            <Pressable
              onPress={onSelectAll}
              className="min-h-[44px] items-center justify-center rounded-full border border-black bg-ink px-4">
              <Bn className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                {`সব (${toBn(exams.length)}টি)`}
              </Bn>
            </Pressable>
            <Pressable
              onPress={onClear}
              className="min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-paper px-4">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setOpen(false)}
              className="min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-paper px-4">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>সম্পন্ন ✓</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
            {DROP_ERAS.map((era) => {
              const list = exams
                .filter((e) => {
                  const n = examNum(e.slug);
                  return n >= era.from && n <= era.to;
                })
                .sort((a, b) => examNum(b.slug) - examNum(a.slug));
              if (!list.length) return null;
              return (
                <View key={era.label}>
                  <View className="bg-paper px-3 py-2">
                    <Bn className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                      {era.label}
                    </Bn>
                  </View>
                  {list.map((e) => {
                    const active = selected.includes(e.slug);
                    return (
                      <Pressable
                        key={e.slug}
                        onPress={() => onToggle(e.slug)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        className="min-h-[48px] flex-row items-center gap-3 border-b border-black/5 px-3">
                        <View
                          className={`h-6 w-6 items-center justify-center border ${active ? 'border-black bg-ink' : 'border-black/25 bg-surface'}`}>
                          {active ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
                        </View>
                        <Bn className="flex-1" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                          {examLabel(e.slug)}
                        </Bn>
                        <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 11 }}>
                          {e.total_questions}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginTop: 8 }}>
        {selected.length
          ? selected
              .map((s) => {
                const n = examNum(s);
                return toBn(n);
              })
              .join(', ')
          : 'খালি = সব পরীক্ষা'}
      </Bn>
    </View>
  );
}

/* ---------- Subject picker (dropdown with tick boxes) ---------- */
export function SubjectDropdown({
  subjects,
  counts,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  subjects: { id: number; subject_bn: string }[];
  counts: Record<number, number>;
  selected: number[];
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const name = (id: number) => subjects.find((s) => s.id === id)?.subject_bn ?? `বিষয় ${id}`;
  return (
    <View style={{ zIndex: 20 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        className="min-h-[44px] flex-row items-center justify-between rounded-md border border-black/20 bg-surface px-3.5 py-2">
        <Bn style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
          {selected.length ? `${toBn(selected.length)}টি বিষয় নির্বাচিত` : `সব (${toBn(subjects.length)}টি বিষয়)`}
        </Bn>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#0A0A0A" />
        </View>
      </Pressable>
      {open ? (
        <View className="border border-t-0 border-black/20 bg-surface">
          <View className="flex-row flex-wrap gap-2 border-b border-black/10 p-3">
            <Pressable
              onPress={onSelectAll}
              className="min-h-[44px] items-center justify-center rounded-full border border-black bg-ink px-4">
              <Bn className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                {`সব (${toBn(subjects.length)}টি)`}
              </Bn>
            </Pressable>
            <Pressable
              onPress={onClear}
              className="min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-paper px-4">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>মুছুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setOpen(false)}
              className="min-h-[44px] items-center justify-center rounded-full border border-black/10 bg-paper px-4">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>সম্পন্ন ✓</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true}>
            {subjects.map((sub) => {
              const active = selected.includes(sub.id);
              return (
                <Pressable
                  key={sub.id}
                  onPress={() => onToggle(sub.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  className="min-h-[48px] flex-row items-center gap-3 border-b border-black/5 px-3">
                  <View
                    className={`h-6 w-6 items-center justify-center border ${active ? 'border-black bg-ink' : 'border-black/25 bg-surface'}`}>
                    {active ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
                  </View>
                  <Bn className="flex-1" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                    {sub.subject_bn}
                  </Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 11 }}>
                    {counts[sub.id] ?? 0}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginTop: 8 }}>
        {selected.length ? selected.map(name).join(' · ') : 'খালি = সব বিষয়'}
      </Bn>
    </View>
  );
}

/* ---------- BCS Exam Tick Selector (Tick mark system replacing dropdowns) ---------- */
export function BcsTickPicker({
  exams,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  title = '১. বিসিএস পরিসর',
  subtitle = 'কোন বিসিএসের প্রশ্ন অন্তর্ভুক্ত করবেন? পছন্দমতো টিক দিন।',
  noBorder = false,
}: {
  exams: { slug: string; total_questions?: number }[];
  selected: string[];
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSelectEra?: (slugs: string[]) => void;
  onDeselectEra?: (slugs: string[]) => void;
  title?: string;
  subtitle?: string;
  noBorder?: boolean;
}) {
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => examNum(b.slug) - examNum(a.slug));
  }, [exams]);

  const isAllSelected = exams.length > 0 && selected.length >= exams.length;

  return (
    <View className={`${noBorder ? '' : 'border-b border-black/10'} p-5`}>
      {/* Header */}
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
        <View>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>{title}</Bn>
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            {subtitle}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Bn className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
            {selected.length === 0
              ? 'কোনোটি নির্বাচিত নয়'
              : isAllSelected
              ? `সব (${toBn(exams.length)}টি) নির্বাচিত`
              : `${toBn(selected.length)}/${toBn(exams.length)}টি নির্বাচিত`}
          </Bn>
          <Pressable
            onPress={() => {
              if (isAllSelected) {
                onClear();
              } else {
                onSelectAll();
              }
            }}>
            <Text className="text-black/70 underline" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
              {isAllSelected ? 'সব মুছুন' : 'সব নির্বাচন করুন'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 50th down to 10th with Tick Box (single continuous card grid) */}
      <View className="flex-row flex-wrap gap-2">
        {sortedExams.map((e) => {
          const active = selected.includes(e.slug);
          const n = examNum(e.slug);
          const label = n ? `${toBn(n)}${n === 10 ? 'ম' : 'তম'}` : e.slug;

          return (
            <Pressable
              key={e.slug}
              onPress={() => onToggle(e.slug)}
              className={`flex-row items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:border-black/35 hover:shadow-xs active:scale-[0.98] ${
                active ? 'border-black bg-black/[0.04]' : 'border-black/15 bg-surface'
              }`}>
              <View
                className={`h-4 w-4 items-center justify-center rounded border ${
                  active ? 'border-black bg-ink' : 'border-black/30 bg-surface'
                }`}>
                {active ? <Check size={11} color="#FFFFFF" strokeWidth={3.5} /> : null}
              </View>
              <Bn
                className={active ? 'text-black font-semibold' : 'text-black/75'}
                style={{ fontFamily: active ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
                {label}
              </Bn>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

