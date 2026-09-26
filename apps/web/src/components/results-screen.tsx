import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Award, Check, ChevronDown, ChevronRight, Clock, LogIn, MinusCircle, Target, X } from 'lucide-react-native';
import { FONT } from '../lib/fonts';
import { formatDateTimeBn, formatDurationBn, optText, toBn, type QuestionRow } from '../lib/format';
import { useAuthStore } from '../lib/auth';
import {
  useAttemptAnswers,
  useAttemptSubjectStats,
  useExamResultDetail,
  useExamResults,
  useQuestionPool,
  useSubjects,
  type ExamResultRow,
  type SubjectStat,
} from '../hooks/queries';
import { AuthModal } from './auth-modal';
import { Bn, ExplanationImage, MathText, Tag } from './ui';
import { Breadcrumb, Card } from './patterns';

const EXAM_TYPE_BN: Record<string, string> = { custom: 'কাস্টম এক্সাম', mock: 'মক এক্সাম' };
const SUMMARY_LIMIT = 10;
const SECTION_PAGE = 10;
const EMPTY_STAT: SubjectStat = { attempted: 0, right: 0, wrong: 0 };
const OPT_KEYS = ['A', 'B', 'C', 'D'];

function durationBn(sec?: number): string {
  const s = Math.max(0, Math.round(sec ?? 0));
  if (s <= 0) return '';
  if (s < 60) return `${toBn(s)} সেকেন্ড`;
  return formatDurationBn(Math.round(s / 60));
}

function accuracyPct(stat: SubjectStat): number {
  return stat.attempted > 0 ? (stat.right / stat.attempted) * 100 : 0;
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-1 w-3.5 rounded-full bg-[#EA0000]" />
      <Text style={{ fontFamily: FONT.uiBold, fontSize: 17 }}>{title}</Text>
      <View className="rounded-full bg-black/[0.06] px-2 py-0.5">
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{toBn(count)}</Bn>
      </View>
    </View>
  );
}

/* "আরও দেখুন" footer row — reveals the next page of results for a section. */
function ShowMoreRow({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center gap-2 border-t border-black/10 bg-black/[0.015] px-4 py-3 transition-colors active:bg-black/5">
      <Bn style={{ fontFamily: FONT.uiBold, fontSize: 13.5 }}>আরও দেখুন</Bn>
      <Bn style={{ fontFamily: FONT.uiMed, fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>{`(${toBn(remaining)}টি বাকি)`}</Bn>
      <ChevronDown size={15} color="#0A0A0A" />
    </Pressable>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? '#047857' : tone === 'red' ? '#BE123C' : '#0A0A0A';
  return (
    <View className="min-w-[96px] flex-1 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2.5">
      <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 11.5 }}>{label}</Bn>
      <Bn style={{ fontFamily: FONT.digitsBold, fontSize: 18, color, marginTop: 2 }}>{value}</Bn>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View className="mt-1 items-center rounded-xl border border-dashed border-black/20 bg-surface p-8">
      <Bn className="text-center text-black/55" style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22 }}>{text}</Bn>
    </View>
  );
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <View className="mt-2 items-center rounded-xl border border-dashed border-black/20 bg-surface p-10">
      <LogIn size={26} color="#EA0000" />
      <Bn className="mt-3" style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>ফলাফল দেখতে লগইন করুন</Bn>
      <Bn className="mt-1 text-center text-black/55" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 20 }}>
        কাস্টম ও মক এক্সামের ফলাফল আপনার অ্যাকাউন্টে সংরক্ষিত থাকে। লগইন করলেই সব ফলাফল ও বিষয়ভিত্তিক বিশ্লেষণ দেখতে পাবেন।
      </Bn>
      <Pressable onPress={onLogin} className="mt-4 flex-row items-center gap-2 rounded-lg bg-[#EA0000] px-5 py-2.5 active:opacity-90">
        <LogIn size={15} color="#fff" />
        <Bn className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>লগইন করুন</Bn>
      </Pressable>
    </View>
  );
}

/* Subject breakdown table: attempted / right / wrong / accuracy per topic. */
function SubjectBreakdown({ rows }: { rows: { id: number; name: string; stat: SubjectStat }[] }) {
  return (
    <View className="overflow-hidden rounded-xl border border-black/10">
      <View className="flex-row items-center border-b border-black/10 bg-black/[0.03] px-4 py-2.5">
        <Bn className="flex-1 text-black/55" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>বিষয়</Bn>
        <Bn className="w-14 text-center text-black/55" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>চেষ্টা</Bn>
        <Bn className="w-14 text-center text-black/55" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>সঠিক</Bn>
        <Bn className="w-14 text-center text-black/55" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>ভুল</Bn>
        <Bn className="w-16 text-right text-black/55" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>নির্ভুলতা</Bn>
      </View>
      {rows.map((r) => (
        <View key={r.id} className="flex-row items-center border-b border-black/5 px-4 py-2.5">
          <Bn className="flex-1 pr-2" style={{ fontFamily: FONT.ui, fontSize: 13 }} numberOfLines={1}>{r.name}</Bn>
          <Bn className="w-14 text-center" style={{ fontFamily: FONT.digits, fontSize: 13 }}>{toBn(r.stat.attempted)}</Bn>
          <Bn className="w-14 text-center" style={{ fontFamily: FONT.digits, fontSize: 13, color: '#047857' }}>{toBn(r.stat.right)}</Bn>
          <Bn className="w-14 text-center" style={{ fontFamily: FONT.digits, fontSize: 13, color: '#BE123C' }}>{toBn(r.stat.wrong)}</Bn>
          <Bn className="w-16 text-right" style={{ fontFamily: FONT.digitsBold, fontSize: 13 }}>
            {r.stat.attempted > 0 ? `${toBn(Math.round(accuracyPct(r.stat)))}%` : '—'}
          </Bn>
        </View>
      ))}
    </View>
  );
}

function ResultRow({ a, onPress }: { a: ExamResultRow; onPress: () => void }) {
  const dur = durationBn(a.time_spent_seconds);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-black/5 bg-surface px-5 py-4 transition-colors hover:bg-black/[0.015] active:bg-black/[0.03]">
      <View className="flex-1 pr-3">
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 15 }} numberOfLines={2}>{a.title}</Bn>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>
            {formatDateTimeBn(Date.parse(a.created_at))}
          </Bn>
          {dur ? (
            <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>• {dur}</Bn>
          ) : null}
        </View>
        <View className="mt-1.5 flex-row flex-wrap items-center gap-3">
          <Bn style={{ fontFamily: FONT.ui, fontSize: 12.5, color: '#047857' }}>সঠিক {toBn(a.correct_count)}</Bn>
          <Bn style={{ fontFamily: FONT.ui, fontSize: 12.5, color: '#BE123C' }}>ভুল {toBn(a.wrong_count)}</Bn>
          <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>মোট {toBn(a.total_questions)}</Bn>
        </View>
      </View>
      <View className="items-end pr-2">
        <Bn style={{ fontFamily: FONT.digitsBold, fontSize: 16 }}>{toBn(Math.round(Number(a.marks_obtained)))}</Bn>
        <Bn className="text-black/40" style={{ fontFamily: FONT.digits, fontSize: 11 }}>/ {toBn(a.total_marks)}</Bn>
      </View>
      <ChevronRight size={18} color="rgba(0,0,0,0.3)" />
    </Pressable>
  );
}

/* Read-only review card: question + options (correct / user's wrong pick) + explanation. */
function ReviewQuestionCard({
  q,
  index,
  variant,
  userPick,
}: {
  q: QuestionRow;
  index: number;
  variant: 'wrong' | 'skipped';
  userPick?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const hasNote = !!q.solve_note || (q.solve_note_image_urls?.length ?? 0) > 0;

  return (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface p-4">
      <View className="mb-2.5 flex-row flex-wrap items-center gap-2">
        <View className="h-6 min-w-[26px] items-center justify-center rounded bg-ink px-2">
          <Bn className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>{toBn(index)}</Bn>
        </View>
        {variant === 'wrong' ? <Tag warn>ভুল উত্তর</Tag> : <Tag>উত্তর দেননি</Tag>}
        <Tag>{q.subject_bn}</Tag>
      </View>

      {q.question ? (
        <MathText
          style={{ fontFamily: FONT.uiBold, fontSize: 15.5, lineHeight: 25, marginBottom: 10 }}
          text={q.question}
        />
      ) : (
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 15.5, lineHeight: 25, marginBottom: 10 }}>
          (ছবিতে প্রশ্ন দেখুন)
        </Bn>
      )}

      {(q.question_image_urls ?? []).map((u) => (
        <ExplanationImage key={u} uri={u} title="প্রশ্নের চিত্র" height={220} className="mb-3 mt-0" />
      ))}

      <View className="my-1 flex-col gap-2">
        {OPT_KEYS.map((k) => {
          const txt = optText(q, k);
          if (!txt) return null;
          const isCorrect = q.correct_answer === k;
          const isPicked = userPick === k;

          let btnClass = 'border-black/10 bg-black/[0.015] text-black/50';
          let badgeClass = 'border-black/15 bg-paper text-black/50';
          let statusTag: ReactNode = null;

          if (isCorrect) {
            btnClass = 'border-emerald-600 bg-emerald-50 text-black font-semibold';
            badgeClass = 'border-emerald-600 bg-emerald-600 text-white';
            statusTag = (
              <View className="flex-row items-center gap-1 rounded bg-emerald-600/10 px-2 py-0.5">
                <Check size={12} color="#047857" strokeWidth={3} />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#047857' }}>সঠিক উত্তর</Text>
              </View>
            );
          } else if (isPicked) {
            btnClass = 'border-rose-500 bg-rose-50 text-black font-semibold';
            badgeClass = 'border-rose-500 bg-rose-500 text-white';
            statusTag = (
              <View className="flex-row items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5">
                <X size={12} color="#BE123C" strokeWidth={3} />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#BE123C' }}>আপনার উত্তর</Text>
              </View>
            );
          }

          return (
            <View key={k} className={`flex-row items-center gap-3 rounded-lg border p-3 ${btnClass}`}>
              <View className={`h-6 w-6 items-center justify-center rounded-full border ${badgeClass}`}>
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>{k}</Bn>
              </View>
              <MathText className="flex-1" style={{ fontFamily: FONT.ui, fontSize: 14.5 }} text={txt} />
              {statusTag}
            </View>
          );
        })}
      </View>

      {hasNote ? (
        <View className="mt-3">
          <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center gap-1.5 py-1">
            <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
              {open ? 'ব্যাখ্যা লুকান' : 'ব্যাখ্যা দেখুন'}
            </Text>
          </Pressable>
          {open ? (
            <View className="mt-2 rounded-lg border border-black/10 bg-paper p-4">
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 13, marginBottom: 4 }}>
                {`সঠিক উত্তর: ${q.correct_answer || 'নেই'}`}
              </Bn>
              {q.solve_note ? (
                <MathText
                  style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, color: 'rgba(0,0,0,0.85)' }}
                  text={q.solve_note}
                />
              ) : null}
              {(q.solve_note_image_urls ?? []).map((u) => (
                <ExplanationImage key={u} uri={u} title="ব্যাখ্যার চিত্র" height={260} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Results list (bottom tab) ---------- */
export function ResultsScreen() {
  const user = useAuthStore((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);

  const { data: attempts, isPending } = useExamResults(user?.id);
  const summaryIds = useMemo(
    () => (attempts ?? []).slice(0, SUMMARY_LIMIT).map((a) => a.id),
    [attempts],
  );
  const { data: stats } = useAttemptSubjectStats(summaryIds, user?.id);
  const { data: subjects } = useSubjects();
  const [customShown, setCustomShown] = useState(SECTION_PAGE);
  const [mockShown, setMockShown] = useState(SECTION_PAGE);

  const list = attempts ?? [];
  const custom = list.filter((a) => a.exam_type === 'custom');
  const mock = list.filter((a) => a.exam_type === 'mock');

  const summaryRows = useMemo(() => {
    const subs = [...(subjects ?? [])].sort((a, b) => a.id - b.id);
    return subs.map((s) => ({ id: s.id, name: s.subject_bn, stat: stats?.[s.id] ?? EMPTY_STAT }));
  }, [subjects, stats]);

  const totals = useMemo(() => {
    return Object.values(stats ?? {}).reduce(
      (acc, s) => ({
        attempted: acc.attempted + s.attempted,
        right: acc.right + s.right,
        wrong: acc.wrong + s.wrong,
      }),
      { attempted: 0, right: 0, wrong: 0 },
    );
  }, [stats]);

  const summaryCount = Math.min(SUMMARY_LIMIT, list.length);

  return (
    <>
      <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
        <View className="mx-auto w-full max-w-[1100px] px-5 py-8">
          <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'ফলাফল' }]} />

          <View className="mb-6">
            <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
            <Text style={{ fontFamily: FONT.displayBlack, fontSize: 28, lineHeight: 36 }}>ফলাফল</Text>
            <Text className="mt-1 text-black/55" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              আপনার সম্পন্ন কাস্টম ও মক এক্সামের ফলাফল এবং বিষয়ভিত্তিক বিশ্লেষণ।
            </Text>
          </View>

          {!user ? (
            <LoginPrompt onLogin={() => setAuthOpen(true)} />
          ) : isPending ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="small" color="#0A0A0A" />
              <Text className="mt-3 text-black/60" style={{ fontFamily: FONT.uiMed, fontSize: 13 }}>ফলাফল আনা হচ্ছে…</Text>
            </View>
          ) : list.length === 0 ? (
            <Empty text="এখনো কোনো ফলাফল নেই। একটি কাস্টম বা মক এক্সাম সম্পন্ন করলেই এখানে দেখা যাবে।" />
          ) : (
            <>
              <Card title="সারসংক্ষেপ" desc={`সর্বশেষ ${toBn(summaryCount)}টি পরীক্ষার ভিত্তিতে বিষয়ভিত্তিক ফলাফল`}>
                <View className="mb-4 flex-row flex-wrap gap-2.5">
                  <StatTile label="মোট চেষ্টা" value={toBn(totals.attempted)} />
                  <StatTile label="সঠিক" value={toBn(totals.right)} tone="green" />
                  <StatTile label="ভুল" value={toBn(totals.wrong)} tone="red" />
                  <StatTile
                    label="নির্ভুলতা"
                    value={totals.attempted > 0 ? `${toBn(Math.round((totals.right / totals.attempted) * 100))}%` : '—'}
                  />
                </View>
                <SubjectBreakdown rows={summaryRows} />
              </Card>

              <View className="mt-6">
                <SectionTitle title="কাস্টম এক্সাম" count={custom.length} />
                {custom.length > 0 ? (
                  <View className="overflow-hidden rounded-xl border border-black/10 bg-surface">
                    {custom.slice(0, customShown).map((a) => (
                      <ResultRow key={a.id} a={a} onPress={() => router.push(`/results/${a.id}` as any)} />
                    ))}
                    {customShown < custom.length ? (
                      <ShowMoreRow
                        remaining={custom.length - customShown}
                        onPress={() => setCustomShown((n) => n + SECTION_PAGE)}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Empty text="এখনো কোনো কাস্টম এক্সাম সম্পন্ন হয়নি।" />
                )}
              </View>

              <View className="mt-6">
                <SectionTitle title="মক এক্সাম" count={mock.length} />
                {mock.length > 0 ? (
                  <View className="overflow-hidden rounded-xl border border-black/10 bg-surface">
                    {mock.slice(0, mockShown).map((a) => (
                      <ResultRow key={a.id} a={a} onPress={() => router.push(`/results/${a.id}` as any)} />
                    ))}
                    {mockShown < mock.length ? (
                      <ShowMoreRow
                        remaining={mock.length - mockShown}
                        onPress={() => setMockShown((n) => n + SECTION_PAGE)}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Empty text="এখনো কোনো মক এক্সাম সম্পন্ন হয়নি।" />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

/* ---------- Single result insight ---------- */
export function ResultInsightScreen({ id }: { id: string }) {
  const user = useAuthStore((s) => s.user);
  const { data: attempt, isPending } = useExamResultDetail(id, user?.id);
  const attemptIds = useMemo(() => (id ? [id] : []), [id]);
  const { data: stats } = useAttemptSubjectStats(attemptIds, user?.id);
  const { data: subjects } = useSubjects();
  const { data: answerRows } = useAttemptAnswers(id, user?.id);
  const wrongRows = useMemo(
    () => (answerRows ?? []).filter((r) => !!r.user_answer && !r.is_correct),
    [answerRows],
  );
  const skippedRows = useMemo(() => (answerRows ?? []).filter((r) => !r.user_answer), [answerRows]);
  const reviewIds = useMemo(
    () => [...wrongRows, ...skippedRows].map((r) => Number(r.question_id)),
    [wrongRows, skippedRows],
  );
  const { data: reviewQuestions } = useQuestionPool({
    key: `result-review-${id}`,
    ids: reviewIds,
    enabled: reviewIds.length > 0,
  });
  const qById = useMemo(
    () => new Map((reviewQuestions ?? []).map((q) => [q.id, q])),
    [reviewQuestions],
  );

  const rows = useMemo(() => {
    const subs = [...(subjects ?? [])].sort((a, b) => a.id - b.id);
    return subs
      .map((s) => ({ id: s.id, name: s.subject_bn, stat: stats?.[s.id] ?? EMPTY_STAT }))
      .filter((r) => r.stat.attempted > 0);
  }, [subjects, stats]);

  const typeBn = attempt ? EXAM_TYPE_BN[attempt.exam_type] ?? 'এক্সাম' : 'এক্সাম';
  const dur = attempt ? durationBn(attempt.time_spent_seconds) : '';

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1100px] px-5 py-8">
        <Breadcrumb
          trail={[
            { label: 'হোম', href: '/' },
            { label: 'ফলাফল', href: '/results' },
            { label: typeBn },
          ]}
        />

        {!user ? (
          <Empty text="ফলাফল দেখতে অনুগ্রহ করে লগইন করুন।" />
        ) : isPending ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="small" color="#0A0A0A" />
          </View>
        ) : !attempt ? (
          <Empty text="এই ফলাফলটি পাওয়া যায়নি।" />
        ) : (
          <>
            <View className="mb-6">
              <View className="mb-2 flex-row items-center gap-2">
                <View className="rounded-full bg-[#EA0000]/10 px-3 py-1">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: '#EA0000' }}>{typeBn}</Bn>
                </View>
              </View>
              <Text style={{ fontFamily: FONT.displayBlack, fontSize: 24, lineHeight: 32 }}>{attempt.title}</Text>
              <View className="mt-2 flex-row flex-wrap items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <Clock size={14} color="rgba(0,0,0,0.45)" />
                  <Bn className="text-black/55" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>
                    {formatDateTimeBn(Date.parse(attempt.created_at))}
                  </Bn>
                </View>
                {dur ? (
                  <Bn className="text-black/55" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>• সময়: {dur}</Bn>
                ) : null}
              </View>
            </View>

            <View className="mb-6 flex-row flex-wrap gap-2.5">
              <StatTile label="সঠিক" value={toBn(attempt.correct_count)} tone="green" />
              <StatTile label="ভুল" value={toBn(attempt.wrong_count)} tone="red" />
              <StatTile label="উত্তরহীন" value={toBn(attempt.unanswered_count)} />
              <StatTile label="মোট প্রশ্ন" value={toBn(attempt.total_questions)} />
              <StatTile
                label="স্কোর"
                value={`${toBn(Math.round(Number(attempt.marks_obtained)))} / ${toBn(attempt.total_marks)}`}
              />
            </View>

            <View className="mb-3 flex-row items-center gap-2">
              <Target size={16} color="#EA0000" />
              <Text style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>বিষয়ভিত্তিক বিশ্লেষণ</Text>
            </View>

            {rows.length > 0 ? (
              <SubjectBreakdown rows={rows} />
            ) : (
              <Empty text="এই পরীক্ষায় কোনো প্রশ্নের উত্তর দেওয়া হয়নি।" />
            )}

            <View className="mt-8">
              <View className="mb-3 flex-row items-center gap-2">
                <X size={16} color="#BE123C" />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>ভুল উত্তর</Text>
                <View className="rounded-full bg-black/[0.06] px-2 py-0.5">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{toBn(wrongRows.length)}</Bn>
                </View>
              </View>
              {wrongRows.length > 0 ? (
                <View className="gap-3">
                  {wrongRows.map((r, i) => {
                    const q = qById.get(Number(r.question_id));
                    return q ? (
                      <ReviewQuestionCard key={r.question_id} q={q} index={i + 1} variant="wrong" userPick={r.user_answer} />
                    ) : null;
                  })}
                </View>
              ) : (
                <Empty text="কোনো ভুল উত্তর নেই।" />
              )}
            </View>

            <View className="mt-8">
              <View className="mb-3 flex-row items-center gap-2">
                <MinusCircle size={16} color="rgba(0,0,0,0.45)" />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>উত্তর দেওয়া হয়নি</Text>
                <View className="rounded-full bg-black/[0.06] px-2 py-0.5">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{toBn(skippedRows.length)}</Bn>
                </View>
              </View>
              {skippedRows.length > 0 ? (
                <View className="gap-3">
                  {skippedRows.map((r, i) => {
                    const q = qById.get(Number(r.question_id));
                    return q ? (
                      <ReviewQuestionCard key={r.question_id} q={q} index={i + 1} variant="skipped" />
                    ) : null;
                  })}
                </View>
              ) : (
                <Empty text="সব প্রশ্নের উত্তর দেওয়া হয়েছে।" />
              )}
            </View>

            <View className="mt-6 flex-row items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
              <Award size={15} color="rgba(0,0,0,0.45)" />
              <Bn className="text-black/55" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                নেট স্কোর হিসাব: সঠিক − (ভুল × ০.৫০)।
              </Bn>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}