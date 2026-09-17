import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock, FileText, HelpCircle, Lightbulb, RotateCcw, ShieldCheck, Sparkles, Target, Trophy, X, XCircle, Zap } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { examLabel, fmtTime, optText, shuffle, toBn, type QuestionRow } from '../lib/format';
import { allocateQuestionCounts, buildSubjectInputs, computeAvailableCounts, sampleQuestions } from '../lib/examAllocation';
import { useLibrary, type MockRerunConfig } from '../lib/library';
import { useExams, useQuestionPool, useSubjects } from '../hooks/queries';
import { useExamStore, type MockPresetCount } from '../store/exam';
import { Btn, Bn, OptBtn, Tag, type OptState } from '../components/ui';
import { Breadcrumb, Cols, RecentPracticeRow, SidebarLayout } from '../components/patterns';

const OPT_KEYS = ['A', 'B', 'C', 'D'];

const DEFAULT_SUBJECTS = [
  'বাংলা ভাষা ও সাহিত্য',
  'English Language & Literature',
  'বাংলাদেশ বিষয়াবলি',
  'আন্তর্জাতিক বিষয়াবলি',
  'ভূগোল, পরিবেশ ও দুর্যোগ',
  'সাধারণ বিজ্ঞান',
  'কম্পিউটার ও তথ্যপ্রযুক্তি',
  'গাণিতিক যুক্তি',
  'মানসিক দক্ষতা',
  'নৈতিকতা ও সুশাসন',
];

export interface MockTier {
  count: MockPresetCount;
  title: string;
  badge: string;
  badgeColor: string;
  minutes: number;
  durationLabel: string;
  desc: string;
}

export const MOCK_TIERS: MockTier[] = [
  {
    count: 200,
    title: 'পূর্ণাঙ্গ মডেল টেস্ট',
    badge: 'অফিসিয়াল ফরম্যাট',
    badgeColor: '#EA0000',
    minutes: 120,
    durationLabel: '১২০ মিনিট (২ ঘণ্টা)',
    desc: 'বিসিএস প্রিলিমিনারি সিলেবাসের ১০টি বিষয়ের পূর্ণাঙ্গ অফিসিয়াল মানবণ্টন অনুযায়ী বাস্তব পরীক্ষা।',
  },
  {
    count: 120,
    title: 'স্ট্যান্ডার্ড মডেল টেস্ট',
    badge: 'মাঝারি ব্যাপ্তি',
    badgeColor: '#0A0A0A',
    minutes: 72,
    durationLabel: '৭২ মিনিট (১ ঘণ্টা ১২ মি.)',
    desc: '১০টি বিষয়ের আনুপাতিক সুষম বণ্টন। ব্যস্ত সময়ে পূর্ণাঙ্গ প্রস্তুতির সেরা মাধ্যম।',
  },
  {
    count: 100,
    title: 'স্প্রিন্ট টেস্ট',
    badge: '১ ঘণ্টার স্পিড টেস্ট',
    badgeColor: '#2563EB',
    minutes: 60,
    durationLabel: '৬০ মিনিট (১ ঘণ্টা)',
    desc: '১ ঘণ্টার নির্দিষ্ট সময়ে দ্রুত সিদ্ধান্ত গ্রহণ ও সময় ব্যবস্থাপনা নিখুঁত করার পরীক্ষা।',
  },
  {
    count: 60,
    title: 'কুইক টেস্ট',
    badge: 'স্বল্প পরিসর',
    badgeColor: '#059669',
    minutes: 36,
    durationLabel: '৩৬ মিনিট',
    desc: 'স্বল্প সময়ে ১০টি বিষয়ের দ্রুত প্রস্তুতি ও তাৎক্ষণিক দক্ষতা যাচাইয়ের সেরা মাধ্যম।',
  },
];

export default function Exam() {
  const st = useExamStore();
  const lib = useLibrary();
  const { data: subjects } = useSubjects();
  const { data: exams } = useExams();
  const c = st.config;

  // Pool: fetch all exams (10th-50th BCS) when started
  const pool = useQuestionPool({
    key: st.poolKey || 'idle',
    slugs: (exams ?? []).map((e) => e.slug),
    enabled: !!st.poolKey,
  });

  // Session: proportional allocation across all 10 subjects at 36s/Q, then shuffled
  const session = useMemo(() => {
    const p = pool.data ?? [];
    if (!p.length) return [];
    const N = c.count;
    const allSubjects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const availableCounts = computeAvailableCounts(p);
    const inputs = buildSubjectInputs(allSubjects, availableCounts);
    const allocation = allocateQuestionCounts(N, inputs, 0);
    const sampled = sampleQuestions(p, allocation.perSubject);
    return shuffle(sampled);
  }, [pool.data, c.count, st.poolKey]);

  /* when pool arrives, start the clock */
  const initKey = useRef('');
  useEffect(() => {
    if (st.poolKey && pool.data && initKey.current !== st.poolKey && !st.result) {
      initKey.current = st.poolKey;
      const mins = c.minutes;
      st.ready(mins);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.poolKey, pool.data]);

  /* countdown */
  useEffect(() => {
    if (!st.running || !session.length) return;
    const id = setInterval(() => {
      const remain = useExamStore.getState().remain - 1;
      useExamStore.getState().tick();
      if (remain <= 0) {
        clearInterval(id);
        doSubmit(true);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.running, st.poolKey, session.length]);

  /* warn on accidental navigation (web) */
  useEffect(() => {
    if (typeof window === 'undefined' || !st.running) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [st.running]);

  const subjectName = (id: number) =>
    subjects?.find((x) => x.id === id)?.subject_bn ?? `বিষয় ${id}`;

  function doSubmit(auto: boolean) {
    const s = useExamStore.getState();
    let right = 0, wrong = 0, skipped = 0, excluded = 0;
    const bySubject: Record<number, { correct: number; attempted: number }> = {};
    const review: { qid: number; st: 'skip' | 'wrong' | 'marked'; pick?: string }[] = [];
    session.forEach((q, i) => {
      if (!q.correct_answer) {
        excluded++;
        return;
      }
      const a = s.answers[i];
      const mk = !!s.marked[i];
      if (a === undefined) {
        skipped++;
        review.push({ qid: q.id, st: 'skip' });
      } else if (a === q.correct_answer) {
        right++;
        const b = (bySubject[q.subject_id] ??= { correct: 0, attempted: 0 });
        b.correct++;
        b.attempted++;
        if (mk) review.push({ qid: q.id, st: 'marked', pick: a });
      } else {
        wrong++;
        const b = (bySubject[q.subject_id] ??= { correct: 0, attempted: 0 });
        b.attempted++;
        review.push({ qid: q.id, st: 'wrong', pick: a });
      }
    });

    const label = `মডেল টেস্ট • ${toBn(c.count)}টি প্রশ্ন (${toBn(c.minutes)} মিনিট)`;
    s.setResult({
      score: right - wrong * 0.5,
      scorable: session.length - excluded,
      right, wrong, skipped, excluded, auto,
      label, bySubject, review,
    });
    const wrongIds = review.filter((r) => r.st === 'wrong').map((r) => r.qid);
    if (wrongIds.length) lib.addWrong(wrongIds);
    lib.pushRecent({
      kind: 'mock',
      label,
      total: session.length - excluded,
      right,
      mockRerun: { count: c.count, minutes: c.minutes },
    });
  }

  const startTier = (count: MockPresetCount) => {
    st.setPreset(count);
    const key = JSON.stringify({ count, t: Date.now() });
    st.begin(key);
  };

  const applyMockRerun = (r: MockRerunConfig) => {
    const validCount: MockPresetCount =
      r.count === 120 || r.count === 100 || r.count === 60 ? r.count : 200;
    startTier(validCount);
  };

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <View
        className={`mx-auto w-full px-5 py-8 ${
          !st.poolKey ? 'max-w-[1100px]' : 'max-w-[880px]'
        }`}>
        {!st.poolKey ? (
          <ConfigView
            subjects={subjects ?? []}
            onRerun={applyMockRerun}
            onStartTier={startTier}
          />
        ) : st.result ? (
          <ExamResultView list={session} subjectName={subjectName} onRetry={() => st.backToPicker()} />
        ) : pool.isPending ? (
          <View className="items-center py-20">
            <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 16 }}>
              প্রশ্নপত্র তৈরি হচ্ছে…
            </Text>
          </View>
        ) : pool.isError || !session.length ? (
          <View className="border border-dashed border-black/20 bg-surface p-8 rounded-xl">
            <Text className="text-center text-black/70" style={{ fontFamily: FONT.ui, fontSize: 15 }}>
              এই নির্বাচনে কোনো প্রশ্ন পাওয়া যায়নি।
            </Text>
            <View className="mt-4 items-center">
              <Btn title="ফিরে যান" onPress={st.backToPicker} />
            </View>
          </View>
        ) : (
          <RunnerView list={session} subjectName={subjectName} onSubmit={doSubmit} />
        )}
      </View>
    </ScrollView>
  );
}

/* ================= Compact Summary Card (Mobile View) ================= */
function CompactSummaryCard({ subjectNames }: { subjectNames: string[] }) {
  return (
    <View className="rounded-xl border border-black/15 bg-surface p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Bn className="text-black" style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>
            মক এক্সাম মানদণ্ড
          </Bn>
          <View className="rounded-full px-2.5 py-0.5 bg-black/[0.05]">
            <Text style={{ fontFamily: FONT.uiSemi, fontSize: 11, color: 'rgba(0,0,0,0.65)' }}>
              ১০টি বিষয় • পূর্ণাঙ্গ সিলেবাস
            </Text>
          </View>
        </View>
      </View>

      {/* Specs Highlights Strip */}
      <View className="mt-3.5 pt-3.5 border-t border-black/10 flex-row flex-wrap items-center gap-x-5 gap-y-2.5">
        <View className="flex-row items-center gap-1.5">
          <Clock size={14} color="#0A0A0A" />
          <Bn className="text-black/80" style={{ fontFamily: FONT.uiSemi, fontSize: 12.5 }}>
            ৩৬ সেকেন্ড / প্রশ্ন
          </Bn>
        </View>
        <View className="flex-row items-center gap-1.5">
          <ShieldCheck size={14} color="#0A0A0A" />
          <Bn className="text-black/80" style={{ fontFamily: FONT.uiSemi, fontSize: 12.5 }}>
            -০.৫০ নেগেটিভ মার্ক
          </Bn>
        </View>
        <View className="flex-row items-center gap-1.5">
          <FileText size={14} color="#0A0A0A" />
          <Bn className="text-black/80" style={{ fontFamily: FONT.uiSemi, fontSize: 12.5 }}>
            ১০ম–৫০তম বিসিএস
          </Bn>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Zap size={14} color="#0A0A0A" />
          <Bn className="text-black/80" style={{ fontFamily: FONT.uiSemi, fontSize: 12.5 }}>
            দুর্বলতা ও নির্ভুলতা বিশ্লেষণ
          </Bn>
        </View>
      </View>

      {/* Subjects */}
      <View className="mt-3.5 pt-3.5 border-t border-black/10">
        <View className="flex-row items-center gap-1.5 mb-2">
          <BookOpen size={13} color="#0A0A0A" />
          <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 11.5 }}>
            সিলেবাসভুক্ত বিষয়সমূহ:
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5">
          {subjectNames.map((name) => (
            <View key={name} className="rounded-md border border-black/10 bg-black/[0.03] px-2 py-0.5">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 11, color: 'rgba(0,0,0,0.8)' }}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ================= Desktop Summary Card (Sidebar) ================= */
function DesktopSummaryCard({ subjectNames }: { subjectNames: string[] }) {
  return (
    <View className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm">
      <Text style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 14 }}>
        মক এক্সাম মানদণ্ড
      </Text>

      {/* Row 1: প্রশ্ন প্রতি সময় */}
      <View className="mb-3 border-b border-black/10 pb-2.5">
        <View className="flex-row items-center gap-2 mb-1">
          <Clock size={15} color="#0A0A0A" />
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            প্রশ্ন প্রতি সময়
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>৩৬ সেকেন্ড / প্রশ্ন</Bn>
      </View>

      {/* Row 2: নেগেটিভ মার্কিং */}
      <View className="mb-3 border-b border-black/10 pb-2.5">
        <View className="flex-row items-center gap-2 mb-1">
          <ShieldCheck size={15} color="#0A0A0A" />
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            নেগেটিভ মার্কিং
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>-০.৫০ নম্বর (ভুল উত্তরে)</Bn>
      </View>

      {/* Row 3: প্রশ্ন ব্যাংক */}
      <View className="mb-3 border-b border-black/10 pb-2.5">
        <View className="flex-row items-center gap-2 mb-1">
          <FileText size={15} color="#0A0A0A" />
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            প্রশ্ন ব্যাংক
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>১০ম–৫০তম বিসিএস</Bn>
      </View>

      {/* Row 4: ফলাফল মূল্যায়ন */}
      <View className="mb-3 border-b border-black/10 pb-2.5">
        <View className="flex-row items-center gap-2 mb-1">
          <Zap size={15} color="#0A0A0A" />
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            ফলাফল ও বিশ্লেষণ
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>দুর্বলতা ও নির্ভুলতা যাচাই</Bn>
      </View>

      {/* Row 5: সিলেবাসভুক্ত বিষয়সমূহ */}
      <View className="pt-1">
        <View className="flex-row items-center gap-2 mb-2">
          <BookOpen size={15} color="#0A0A0A" />
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            সিলেবাসভুক্ত বিষয়সমূহ
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-1.5 mt-0.5">
          {subjectNames.map((name) => (
            <View key={name} className="rounded-md border border-black/10 bg-black/[0.03] px-2 py-0.5">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 11, color: 'rgba(0,0,0,0.8)' }}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ================= Config View ================= */
function ConfigView({
  subjects,
  onRerun,
  onStartTier,
}: {
  subjects: { id: number; subject_bn: string }[];
  onRerun: (r: MockRerunConfig) => void;
  onStartTier: (count: MockPresetCount) => void;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const lib = useLibrary();
  const recents = lib.recents.filter((r) => r.kind === 'mock').slice(0, 3);
  const subjectNames = subjects.length ? subjects.map((s) => s.subject_bn) : DEFAULT_SUBJECTS;

  /* Sidebar: format info (desktop only) + recent mocks */
  const sidebar = (
    <View className="gap-4">
      {/* Standard Info card on desktop */}
      {isWide && <DesktopSummaryCard subjectNames={subjectNames} />}

      {/* Recent Mocks */}
      {recents.length > 0 ? (
        <View>
          <Text style={{ fontFamily: FONT.uiBold, fontSize: 15, marginBottom: 8 }}>
            সাম্প্রতিক মক এক্সাম
          </Text>
          <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-xs">
            {recents.map((r) => (
              <RecentPracticeRow
                key={r.id}
                title={r.label}
                sub="মক এক্সাম"
                scoreText={`${toBn(r.right)}/${toBn(r.total)}`}
                pctText={`${toBn(Math.round((r.right / Math.max(1, r.total)) * 100))}% সম্পন্ন`}
                pct={(r.right / Math.max(1, r.total)) * 100}
                onPress={() => r.mockRerun && onRerun(r.mockRerun)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View>
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'মক এক্সাম' }]} />

      <SidebarLayout sidebar={sidebar} sidebarWidth={300} reverseOnMobile={true}>
        <View>
          {/* Red accent line */}
          <View className="mb-3 h-1 w-10 rounded-full bg-[#EA0000]" />

          {/* Title & Subtitle */}
          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 32, lineHeight: 42, marginBottom: 6 }}>
            মক এক্সাম
          </Text>
          <Text
            className="text-black/70"
            style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 22, marginBottom: !isWide ? 14 : 20 }}>
            বাস্তব বিসিএস প্রিলিমিনারি পরীক্ষার মতো পরিবেশে নিজেকে যাচাই করুন।
          </Text>

          {/* Mobile view: summary card under title */}
          {!isWide && (
            <View className="mb-5">
              <CompactSummaryCard subjectNames={subjectNames} />
            </View>
          )}

          {/* Preset Cards Selection: Click directly to start */}
          <View className="gap-3.5 mb-6">
            {MOCK_TIERS.map((tier) => {
              return (
                <Pressable
                  key={tier.count}
                  onPress={() => onStartTier(tier.count)}
                  className="group rounded-xl border border-black/15 bg-surface p-5 transition-all hover:border-black/45 hover:shadow-sm active:scale-[0.99] cursor-pointer">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2 mb-2">
                        <Bn
                          className="text-black group-hover:text-[#EA0000] transition-colors"
                          style={{ fontFamily: FONT.uiBold, fontSize: 18 }}>
                          {tier.title}
                        </Bn>
                        <View className="rounded-full px-2.5 py-0.5 bg-black/[0.05]">
                          <Text
                            style={{
                              fontFamily: FONT.uiSemi,
                              fontSize: 11,
                              color: 'rgba(0,0,0,0.65)',
                            }}>
                            {tier.badge}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-black/65"
                        style={{ fontFamily: FONT.ui, fontSize: 13.5, lineHeight: 20 }}>
                        {tier.desc}
                      </Text>
                    </View>

                    {/* Arrow indicator */}
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] transition-all group-hover:bg-black group-hover:scale-105 shrink-0 mt-0.5">
                      <ChevronRight size={17} color="rgba(0,0,0,0.4)" className="group-hover:text-white" />
                    </View>
                  </View>

                  {/* Highlights Strip */}
                  <View className="mt-4 pt-3.5 border-t border-black/10 flex-row flex-wrap items-center gap-5">
                    <View className="flex-row items-center gap-1.5">
                      <FileText size={15} color="rgba(0,0,0,0.55)" />
                      <Bn
                        className="text-black font-semibold"
                        style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                        {`${toBn(tier.count)}টি প্রশ্ন`}
                      </Bn>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={15} color="rgba(0,0,0,0.55)" />
                      <Bn
                        className="text-black font-semibold"
                        style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                        {tier.durationLabel}
                      </Bn>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Zap size={15} color="#B45309" />
                      <Bn
                        className="text-black/75"
                        style={{ fontFamily: FONT.uiSemi, fontSize: 12.5 }}>
                        প্রশ্ন প্রতি সময়: ৩৬ সেকেন্ড
                      </Bn>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SidebarLayout>
    </View>
  );
}

/* ================= Exam Question Card (Practice Screen Style) ================= */
const ExamQuestionCard = memo(function ExamQuestionCard({
  q,
  index,
  subjectLabel,
  picked,
  onAnswer,
}: {
  q: QuestionRow;
  index: number;
  subjectLabel: string;
  picked?: string;
  onAnswer: (index: number, key: string) => void;
}) {
  const disabled = !q.correct_answer;

  return (
    <View
      nativeID={`exam-q-${index}`}
      className="overflow-hidden rounded-xl border border-black/10 bg-surface p-5 shadow-sm transition-shadow hover:shadow">
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-6 min-w-[26px] items-center justify-center rounded bg-ink px-2">
            <Bn className="text-white font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
              {toBn(index + 1)}
            </Bn>
          </View>
          <Tag>{subjectLabel}</Tag>
          {disabled ? <Tag warn>উৎসে উত্তর নেই</Tag> : null}
        </View>
      </View>

      {/* Question text */}
      <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, marginBottom: q.question ? 14 : 4 }}>
        {q.question || '(ছবিতে প্রশ্ন দেখুন)'}
      </Bn>

      {/* Images */}
      {(q.question_image_urls ?? []).map((u) => (
        <View key={u} className="mb-4 items-center rounded-lg border border-black/10 bg-white p-3">
          <Image source={{ uri: u }} style={{ width: '100%', height: 220 }} contentFit="contain" />
        </View>
      ))}

      {/* Options */}
      <View className="my-2 flex-col gap-2">
        {OPT_KEYS.map((k) => {
          const txt = optText(q, k);
          if (!txt) return null;
          const isPicked = picked === k;

          let btnClass = 'border-black/15 bg-surface text-black/85 hover:border-black/35 cursor-pointer';
          let badgeClass = 'border-black/20 bg-paper text-black/70';

          if (isPicked) {
            btnClass = 'border-[#EA0000] bg-[#EA0000]/[0.05] text-black font-semibold shadow-xs';
            badgeClass = 'border-[#EA0000] bg-[#EA0000] text-white';
          }

          return (
            <Pressable
              key={k}
              disabled={disabled}
              onPress={() => onAnswer(index, k)}
              className={`flex-row items-center gap-3 rounded-lg border p-3 transition-colors ${btnClass}`}>
              <View className={`h-6 w-6 items-center justify-center rounded-full border ${badgeClass}`}>
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>{k}</Bn>
              </View>
              <Bn className="flex-1" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
                {txt}
              </Bn>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

/* ================= Runner View (Continuous List Like Practice Mode) ================= */
function RunnerView({
  list,
  subjectName,
  onSubmit,
}: {
  list: QuestionRow[];
  subjectName: (id: number) => string;
  onSubmit: (auto: boolean) => void;
}) {
  const st = useExamStore();
  const answeredCount = Object.keys(st.answers).length;

  return (
    <View className="gap-5">
      <Breadcrumb
        trail={[
          { label: 'হোম', href: '/' },
          { label: 'মক এক্সাম', onPress: () => st.backToPicker() },
          { label: `পরীক্ষা চলছে (${toBn(st.config.count)} প্রশ্ন)` },
        ]}
      />

      {/* Top Header Bar with Timer, Progress & Submit */}
      <View className="overflow-hidden rounded-xl border border-black/10 bg-ink shadow-sm">
        <View className="flex-row flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <View>
            <Bn className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>
              {`মডেল টেস্ট • ${toBn(st.config.count)}টি প্রশ্ন`}
            </Bn>
            <Text className="text-white/70" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
              {`পূর্ণমান: ${toBn(list.filter((x) => x.correct_answer).length)} · ভুল উত্তরে −০.৫০`}
            </Text>
          </View>

          <View className="flex-row items-center gap-4">
            <View className="items-center">
              <Text className="text-white" style={{ fontFamily: FONT.displayBlack, fontSize: 20 }}>
                {fmtTime(st.remain)}
              </Text>
              <Text className="text-white/70" style={{ fontFamily: FONT.uiSemi, fontSize: 11 }}>
                সময় বাকি
              </Text>
            </View>

            <View className="h-8 w-px bg-white/20" />

            <View className="items-center">
              <Text className="text-white" style={{ fontFamily: FONT.displayBlack, fontSize: 20 }}>
                {`${toBn(answeredCount)}/${toBn(list.length)}`}
              </Text>
              <Text className="text-white/70" style={{ fontFamily: FONT.uiSemi, fontSize: 11 }}>
                উত্তর সম্পন্ন
              </Text>
            </View>

            <Btn
              title="জমা দিন"
              variant="accent"
              onPress={() => onSubmit(false)}
            />
          </View>
        </View>
      </View>

      {/* All Questions Stack */}
      <View className="gap-4">
        {list.map((q, i) => (
          <ExamQuestionCard
            key={q.id}
            q={q}
            index={i}
            subjectLabel={subjectName(q.subject_id)}
            picked={st.answers[i]}
            onAnswer={st.answer}
          />
        ))}

        {/* Bottom Submit Banner */}
        <View className="mt-4 rounded-xl border border-black/15 bg-surface p-6 sm:p-8 items-center shadow-xs">
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, marginBottom: 4 }}>
            সবগুলো প্রশ্নের উত্তর নিশ্চিত করেছেন?
          </Bn>
          <Text className="text-black/60 mb-5 text-center" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
            মোট {toBn(list.length)}টি প্রশ্নের মধ্যে {toBn(answeredCount)}টির উত্তর দেওয়া হয়েছে।
            {answeredCount < list.length ? ` এখনও ${toBn(list.length - answeredCount)}টি বাকি।` : ''}
          </Text>
          <Btn
            title={`মক এক্সাম জমা দিন (${toBn(answeredCount)}/${toBn(list.length)})`}
            variant="accent"
            onPress={() => onSubmit(false)}
          />
        </View>
      </View>
    </View>
  );
}



/* ================= Result View ================= */
function ExamReviewCard({
  q,
  index,
  userPick,
  status,
  subjectName,
}: {
  q: QuestionRow;
  index: number;
  userPick?: string;
  status: 'skip' | 'wrong' | 'marked';
  subjectName: string;
}) {
  const [showNote, setShowNote] = useState(true);
  const exam = examLabel(q.exam_slug);
  const qNum = toBn(q.question_number);
  const userPickText = optText(q, userPick ?? '');
  const correctText = optText(q, q.correct_answer ?? '');
  const isWrong = status === 'wrong';
  const isSkipped = status === 'skip' || !userPick;
  const isMarked = status === 'marked';

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-black/10 bg-surface shadow-xs transition-shadow hover:shadow-sm">
      {/* Card Header Bar */}
      <View className="flex-row items-center justify-between border-b border-black/5 bg-black/[0.015] px-4 sm:px-5 py-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <View
            className={`h-6 items-center justify-center rounded-md px-2.5 shadow-xs ${
              isWrong
                ? 'bg-rose-600'
                : isSkipped
                  ? 'bg-black/60'
                  : 'bg-amber-600'
            }`}>
            <Bn className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>
              {`প্রশ্ন #${toBn(index + 1)} · ${isWrong ? 'ভুল' : isSkipped ? 'উত্তরহীন' : 'রিভিউ'}`}
            </Bn>
          </View>
          <View className="rounded-md border border-black/10 bg-white px-2.5 py-0.5 shadow-xs">
            <Text className="text-black/80 font-medium" style={{ fontFamily: FONT.uiSemi, fontSize: 11.5 }}>
              {subjectName}
            </Text>
          </View>
          <View className="rounded-md border border-black/10 bg-white px-2.5 py-0.5 shadow-xs">
            <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 11.5 }}>
              {`${exam} · প্রশ্ন ${qNum}`}
            </Text>
          </View>
          {isMarked && (
            <View className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5">
              <Text className="text-amber-800 font-semibold" style={{ fontFamily: FONT.uiSemi, fontSize: 11 }}>
                রিভিউ চিহ্নিত ছিল
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="p-4 sm:p-5">
        {/* Question Text */}
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16.5, lineHeight: 26, marginBottom: q.question ? 12 : 4, color: '#0A0A0A' }}>
          {q.question || '(ছবিতে প্রশ্ন দেখুন)'}
        </Bn>

        {/* Question Images */}
        {(q.question_image_urls ?? []).map((u) => (
          <View key={u} className="mb-4 items-center rounded-xl border border-black/10 bg-white p-3">
            <Image source={{ uri: u }} style={{ width: '100%', height: 220 }} contentFit="contain" />
          </View>
        ))}

        {/* Comparative Answers */}
        <View className="my-2 gap-2.5">
          {/* User Answer */}
          <View
            className={`flex-row items-start gap-3 rounded-xl border p-3.5 ${
              isWrong
                ? 'border-rose-200 bg-rose-50/60'
                : 'border-black/10 bg-black/[0.02]'
            }`}>
            <View
              className={`h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5 shadow-xs ${
                isWrong ? 'bg-rose-600' : 'bg-black/40'
              }`}>
              {isWrong ? (
                <X size={13} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <HelpCircle size={13} color="#FFFFFF" />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 mb-1">
                <Text
                  className={`font-bold tracking-wide ${isWrong ? 'text-rose-700' : 'text-black/60'}`}
                  style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>
                  আপনার উত্তর
                </Text>
                {userPick && (
                  <View className="h-4 min-w-[20px] px-1.5 rounded items-center justify-center bg-rose-200/90">
                    <Text className="text-rose-950 font-bold" style={{ fontFamily: FONT.digitsBold, fontSize: 11 }}>
                      {userPick}
                    </Text>
                  </View>
                )}
              </View>
              <Bn
                className={isWrong ? 'text-rose-950 font-medium' : 'text-black/55'}
                style={{ fontFamily: FONT.ui, fontSize: 14.5, lineHeight: 22 }}>
                {userPick ? `${userPick} — ${userPickText}` : 'উত্তর প্রদান করেননি (ফাঁকা)'}
              </Bn>
            </View>
          </View>

          {/* Correct Answer */}
          <View className="flex-row items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5">
            <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 mt-0.5 shadow-xs">
              <Check size={13} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-emerald-800 font-bold tracking-wide" style={{ fontFamily: FONT.uiBold, fontSize: 11.5 }}>
                  সঠিক উত্তর
                </Text>
                <View className="h-4 min-w-[20px] px-1.5 rounded bg-emerald-200/90 items-center justify-center">
                  <Text className="text-emerald-950 font-bold" style={{ fontFamily: FONT.digitsBold, fontSize: 11 }}>
                    {q.correct_answer || '—'}
                  </Text>
                </View>
              </View>
              <Bn className="text-emerald-950 font-semibold" style={{ fontFamily: FONT.ui, fontSize: 14.5, lineHeight: 22 }}>
                {correctText ? `${q.correct_answer} — ${correctText}` : (q.correct_answer || 'উৎসে উত্তর অনুপস্থিত')}
              </Bn>
            </View>
          </View>
        </View>

        {/* Solve Note / Explanation Box */}
        {q.solve_note || (q.solve_note_image_urls && q.solve_note_image_urls.length > 0) ? (
          <View className="mt-3 overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/40">
            <Pressable
              onPress={() => setShowNote(!showNote)}
              className="flex-row items-center justify-between border-b border-amber-200/50 bg-amber-100/50 px-3.5 py-2.5">
              <View className="flex-row items-center gap-2">
                <Lightbulb size={15} color="#B45309" />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 12.5, color: '#92400E' }}>
                  বিস্তারিত ব্যাখ্যা ও সমাধান
                </Text>
              </View>
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 11.5, color: '#B45309' }}>
                {showNote ? 'লুকান ↑' : 'দেখুন ↓'}
              </Text>
            </Pressable>

            {showNote && (
              <View className="p-3.5 sm:p-4">
                {q.solve_note ? (
                  <Bn style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 23, color: '#451A03' }}>
                    {q.solve_note}
                  </Bn>
                ) : null}

                {(q.solve_note_image_urls ?? []).map((u) => (
                  <View key={u} className="mt-3 items-center rounded-lg border border-black/10 bg-white p-2.5">
                    <Image source={{ uri: u }} style={{ width: '100%', height: 200 }} contentFit="contain" />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ExamResultView({
  list,
  subjectName,
  onRetry,
}: {
  list: QuestionRow[];
  subjectName: (id: number) => string;
  onRetry: () => void;
}) {
  const { width } = useWindowDimensions();
  const st = useExamStore();
  const r = st.result;
  if (!r) return null;
  const byId = new Map(list.map((qq) => [qq.id, qq]));
  const attempted = r.right + r.wrong;
  const acc = attempted ? Math.round((r.right / attempted) * 100) : 0;
  const total = r.scorable;

  return (
    <View className="gap-5">
      <Breadcrumb
        trail={[
          { label: 'হোম', href: '/' },
          { label: 'মক এক্সাম', onPress: () => st.backToPicker() },
          { label: 'ফলাফল' },
        ]}
      />

      {/* Top Score Banner */}
      <View className="relative overflow-hidden rounded-2xl border border-black/10 bg-surface p-6 sm:p-8 shadow-sm">
        <View className="items-center">
          {/* Performance Badge */}
          <View
            className={`mb-3.5 flex-row items-center gap-1.5 rounded-full px-3.5 py-1 border shadow-2xs ${
              acc >= 80
                ? 'border-emerald-200 bg-emerald-50'
                : acc >= 50
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-rose-200 bg-rose-50'
            }`}>
            {acc >= 80 ? (
              <Trophy size={14} color="#059669" />
            ) : acc >= 50 ? (
              <Target size={14} color="#D97706" />
            ) : (
              <AlertCircle size={14} color="#E11D48" />
            )}
            <Text
              style={{
                fontFamily: FONT.uiBold,
                fontSize: 12.5,
                color: acc >= 80 ? '#065F46' : acc >= 50 ? '#92400E' : '#9F1239',
              }}>
              {acc >= 80
                ? 'চমৎকার প্রস্তুতি!'
                : acc >= 50
                  ? 'সন্তোষজনক অগ্রগতি'
                  : 'আরও নিবিড় অনুশীলন প্রয়োজন'}
            </Text>
          </View>

          {/* Primary Score Typography */}
          <View className="flex-row items-baseline justify-center gap-2">
            <Bn bold style={{ fontFamily: FONT.displayBlack, fontSize: width > 600 ? 50 : 38, lineHeight: width > 600 ? 58 : 46, color: '#0A0A0A' }}>
              {toBn(r.score % 1 === 0 ? `${r.score}` : r.score.toFixed(2))}
            </Bn>
            <Text className="text-black/30" style={{ fontFamily: FONT.display, fontSize: width > 600 ? 32 : 24 }}>
              /
            </Text>
            <Text className="text-black/50" style={{ fontFamily: FONT.display, fontSize: width > 600 ? 30 : 22 }}>
              {toBn(total)}
            </Text>
          </View>

          {/* Context Line */}
          <Text className="text-black/65 mt-2 text-center" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
            {`${r.label} — প্রাপ্ত স্কোর (ভুল উত্তরে −০.৫০ নেগেটিভ মার্কিং) · নির্ভুলতা ${toBn(acc)}%`}
            {r.auto ? ' · সময় শেষে স্বয়ংক্রিয় জমা' : ''}
          </Text>

          {/* Visual Ratio Progress Bar */}
          <View className="mt-5 w-full max-w-[480px] flex-col gap-2">
            <View className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06] flex-row">
              {r.right > 0 && (
                <View
                  style={{ width: `${Math.max(2, (r.right / total) * 100)}%` }}
                  className="h-full bg-emerald-500"
                />
              )}
              {r.wrong > 0 && (
                <View
                  style={{ width: `${Math.max(2, (r.wrong / total) * 100)}%` }}
                  className="h-full bg-rose-500"
                />
              )}
            </View>
            <View className="flex-row justify-between text-xs px-0.5">
              <Text className="text-emerald-700 font-semibold" style={{ fontFamily: FONT.uiSemi, fontSize: 11.5 }}>
                {`সঠিক ${toBn(r.right)}টি (${toBn(total ? Math.round((r.right / total) * 100) : 0)}%)`}
              </Text>
              <Text className="text-rose-700 font-semibold" style={{ fontFamily: FONT.uiSemi, fontSize: 11.5 }}>
                {`ভুল ${toBn(r.wrong)}টি (${toBn(total ? Math.round((r.wrong / total) * 100) : 0)}%)`}
              </Text>
              {r.skipped > 0 && (
                <Text className="text-black/45" style={{ fontFamily: FONT.ui, fontSize: 11.5 }}>
                  {`ফাঁকা ${toBn(r.skipped)}টি`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Metric Breakdown Grid */}
      <View className="flex-row flex-wrap gap-3">
        {[
          { label: 'সঠিক উত্তর', val: `+${toBn(r.right)}`, sub: `${toBn(total ? Math.round((r.right / total) * 100) : 0)}% সফল`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'border-emerald-200/90 bg-emerald-50/50' },
          { label: 'ভুল উত্তর', val: `-${toBn(r.wrong)}`, sub: `${toBn(total ? Math.round((r.wrong / total) * 100) : 0)}% ভুল`, icon: XCircle, color: 'text-rose-700', bg: 'border-rose-200/90 bg-rose-50/50' },
          { label: 'নেগেটিভ মার্ক', val: `-${toBn(r.wrong * 0.5)}`, sub: 'ভুল উত্তরে −০.৫০', icon: AlertTriangle, color: 'text-amber-800', bg: 'border-amber-200/90 bg-amber-50/50' },
          { label: 'ফাঁকা / উত্তরহীন', val: toBn(r.skipped), sub: `${toBn(total ? Math.round((r.skipped / total) * 100) : 0)}% বাকি`, icon: HelpCircle, color: 'text-black/80', bg: 'border-black/10 bg-surface' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <View
              key={stat.label}
              style={{
                width: width > 768 ? 'calc(25% - 9px)' : 'calc(50% - 6px)',
              } as any}
              className={`rounded-2xl border p-4 shadow-2xs items-start justify-between ${stat.bg}`}>
              <View className="flex-row items-center justify-between w-full mb-1">
                <Text className="text-black/60 font-semibold" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                  {stat.label}
                </Text>
                <Icon size={16} className={stat.color} />
              </View>
              <Text className={`${stat.color}`} style={{ fontFamily: FONT.digitsBold, fontSize: 26, fontWeight: '700' }}>
                {stat.val}
              </Text>
              <Text className="text-black/50 mt-0.5" style={{ fontFamily: FONT.ui, fontSize: 11.5 }}>
                {stat.sub}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Subject-wise Accuracy */}
      <View className="mt-2">
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, marginBottom: 8 }}>বিষয়ভিত্তিক নির্ভুলতা ও বিশ্লেষণ</Bn>
        <View className="rounded-2xl border border-black/10 bg-surface p-4 sm:p-5 shadow-xs">
          {Object.keys(r.bySubject).length ? (
            Object.entries(r.bySubject).map(([sid, d]) => {
              const subAcc = Math.round((d.correct / Math.max(1, d.attempted)) * 100);
              return (
                <View key={sid} className="border-b border-black/5 py-3 last:border-b-0">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text style={{ fontFamily: FONT.uiBold, fontSize: 14.5 }}>{subjectName(parseInt(sid, 10))}</Text>
                    <Text style={{ fontFamily: FONT.digitsBold, fontSize: 13.5, color: '#0A0A0A' }}>
                      {`সঠিক: ${toBn(d.correct)} / ${toBn(d.attempted)}`}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                      {`মোট উত্তর: ${toBn(d.attempted)}টি · ভুল: ${toBn(Math.max(0, d.attempted - d.correct))}টি`}
                    </Text>
                    <Text className="text-black/70 font-semibold" style={{ fontFamily: FONT.digitsBold, fontSize: 12.5 }}>
                      {`নির্ভুলতা ${toBn(subAcc)}%`}
                    </Text>
                  </View>
                  <View className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden mt-1.5">
                    <View
                      className={`h-full ${
                        subAcc >= 80 ? 'bg-emerald-500' : subAcc >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${subAcc}%` }}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 14 }}>কোনো মূল্যায়নযোগ্য উত্তর নেই।</Text>
          )}
        </View>
      </View>

      {/* Answer Sheet Review */}
      <View className="mt-2">
        <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-ink text-white">
              <FileText size={17} color="#FFFFFF" />
            </View>
            <View>
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, color: '#0A0A0A' }}>
                {`সম্পূর্ণ উত্তরপত্র পর্যালোচনা (${toBn(r.review.length)})`}
              </Bn>
              <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                সকল প্রশ্নের সঠিক-ভুল উত্তর ও বিস্তারিত ব্যাখ্যা দেখে নিন
              </Text>
            </View>
          </View>
        </View>

        {r.review.map((rv, idx) => {
          const q = byId.get(rv.qid);
          if (!q) return null;
          return (
            <ExamReviewCard
              key={rv.qid}
              q={q}
              index={idx}
              userPick={rv.pick}
              status={rv.st}
              subjectName={subjectName(q.subject_id)}
            />
          );
        })}
      </View>

      {/* Bottom Controls */}
      <View className="mt-4 rounded-2xl border border-black/10 bg-surface p-5 sm:p-6 shadow-sm">
        <View className="mb-3.5 flex-row items-center gap-2">
          <Sparkles size={16} color="#EA0000" />
          <Text style={{ fontFamily: FONT.uiBold, fontSize: 14.5, color: '#0A0A0A' }}>
            পরবর্তী পদক্ষেপ
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <Pressable
            onPress={onRetry}
            className="min-h-[46px] flex-row items-center justify-center gap-2 rounded-xl bg-ink px-6 py-2.5 shadow-xs active:bg-black/90 transition-colors">
            <RotateCcw size={15} color="#FFFFFF" />
            <Text className="text-white font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
              আবার পরীক্ষা দিন
            </Text>
          </Pressable>

          <Pressable
            onPress={() => st.backToPicker()}
            className="min-h-[46px] flex-row items-center justify-center gap-2 rounded-xl border border-black/20 bg-surface px-5 py-2.5 hover:border-black/40 hover:bg-black/[0.02] active:scale-[0.99] transition-all">
            <ArrowLeft size={15} color="#0A0A0A" />
            <Text className="text-black font-semibold" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
              মক টেস্ট তালিকায় ফিরুন
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
