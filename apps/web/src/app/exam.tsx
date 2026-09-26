import { useEffect, useMemo, useRef, useState, memo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Clock, FileText, HelpCircle, Lightbulb, RotateCcw, ShieldCheck, Sparkles, Target, Trophy, X, XCircle, Zap } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { examLabel, fmtTime, optText, shuffle, toBn, type QuestionRow } from '../lib/format';
import { allocateQuestionCounts, buildSubjectInputs, computeAvailableCounts, sampleQuestions } from '../lib/examAllocation';
import { useLibrary, type AttemptAnswerInput } from '../lib/library';
import { useExams, useQuestionPool, useSubjects } from '../hooks/queries';
import { useExamStore, type MockPresetCount } from '../store/exam';
import { useExamGuardStore } from '../store/examGuard';
import { Btn, Bn, MathText, OptBtn, Tag, type OptState } from '../components/ui';
import { Breadcrumb, Cols, SidebarLayout } from '../components/patterns';
import { ExplanationImage } from '../components/image-lightbox';

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
    // Save full mock attempt to database
    const answers: AttemptAnswerInput[] = session
      .filter((q) => !!q.correct_answer)
      .map((q) => {
        const idx = session.indexOf(q);
        const a = s.answers[idx];
        const isCorrect = a === q.correct_answer;
        return {
          question_id: q.id,
          subject_id: q.subject_id,
          user_answer: a ?? null,
          correct_answer: q.correct_answer ?? null,
          is_correct: isCorrect,
          time_spent_seconds: 0,
        };
      });

    lib.saveExamAttempt({
      exam_type: 'mock',
      title: label,
      total_questions: session.length - excluded,
      correct_count: right,
      wrong_count: wrong,
      unanswered_count: skipped,
      negative_marking: 0.50,
      marks_obtained: Math.max(0, right - wrong * 0.5),
      total_marks: session.length - excluded,
      time_spent_seconds: Math.max(0, (c.minutes * 60) - s.remain),
      answers,
    });
  }

  /* Register submit handler for top nav TopBar */
  useEffect(() => {
    if (st.running) {
      useExamStore.getState().registerSubmitHandler(() => doSubmit(false));
    } else {
      useExamStore.getState().registerSubmitHandler(null);
    }
    return () => {
      useExamStore.getState().registerSubmitHandler(null);
    };
  }, [st.running, session, c]);

  const startTier = (count: MockPresetCount) => {
    st.setPreset(count);
    const key = JSON.stringify({ count, t: Date.now() });
    st.begin(key);
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
  onStartTier,
}: {
  subjects: { id: number; subject_bn: string }[];
  onStartTier: (count: MockPresetCount) => void;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const subjectNames = subjects.length ? subjects.map((s) => s.subject_bn) : DEFAULT_SUBJECTS;

  /* Sidebar: format info (desktop only) */
  const sidebar = (
    <View className="gap-4">
      {/* Standard Info card on desktop */}
      {isWide && <DesktopSummaryCard subjectNames={subjectNames} />}
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
      {q.question ? (
        <MathText
          style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, marginBottom: 14 }}
          text={q.question}
        />
      ) : (
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, marginBottom: 4 }}>
          (ছবিতে প্রশ্ন দেখুন)
        </Bn>
      )}

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
              <MathText className="flex-1" style={{ fontFamily: FONT.ui, fontSize: 14 }} text={txt} />
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
          {
            label: 'হোম',
            onPress: () => useExamGuardStore.getState().openQuitModal(() => router.push('/')),
          },
          {
            label: 'মক এক্সাম',
            onPress: () => useExamGuardStore.getState().openQuitModal(() => st.backToPicker()),
          },
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

          <View className="flex-row items-center gap-3 sm:gap-4">
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

            <Pressable
              onPress={() => useExamGuardStore.getState().openQuitModal(() => st.backToPicker())}
              style={{ cursor: 'pointer' } as any}
              className="rounded-lg border border-white/25 px-3 py-2 transition-colors hover:bg-white/10 active:scale-95">
              <Text className="text-white/80 text-xs font-semibold" style={{ fontFamily: FONT.uiSemi }}>
                পরীক্ষা বাতিল
              </Text>
            </Pressable>

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
/* ================= Result / Review Card ================= */
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
  const isWrong = status === 'wrong';
  const isSkipped = status === 'skip' || !userPick;
  const isMarked = status === 'marked';

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-black/10 bg-surface p-5 sm:p-6 shadow-xs">
      {/* Card Header Bar */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="h-6 min-w-[26px] items-center justify-center rounded bg-ink px-2">
            <Bn className="text-white font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>
              {toBn(index + 1)}
            </Bn>
          </View>
          {isWrong ? (
            <Tag warn>ভুল উত্তর</Tag>
          ) : isSkipped ? (
            <Tag>উত্তরহীন</Tag>
          ) : (
            <Tag>সঠিক উত্তর</Tag>
          )}
          <Tag>{subjectName}</Tag>
          <Tag>{`${exam} · প্রশ্ন ${qNum}`}</Tag>
          {isMarked ? <Tag warn>রিভিউ চিহ্নিত</Tag> : null}
        </View>
      </View>

      {/* Question Text */}
      {q.question ? (
        <MathText
          style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, color: '#0A0A0A', marginBottom: 14 }}
          text={q.question}
        />
      ) : (
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, color: '#0A0A0A', marginBottom: 4 }}>
          (ছবিতে প্রশ্ন দেখুন)
        </Bn>
      )}

      {/* Question Images */}
      {(q.question_image_urls ?? []).map((u) => (
        <ExplanationImage key={u} uri={u} title="প্রশ্নের চিত্র" height={220} className="mb-4 mt-0" />
      ))}

      {/* Options in Clean Native Style */}
      <View className="my-2 flex-col gap-2">
        {OPT_KEYS.map((k) => {
          const txt = optText(q, k);
          if (!txt) return null;
          const isPicked = userPick === k;
          const isCorrect = q.correct_answer === k;

          let btnClass = 'border-black/10 bg-surface text-black/50 opacity-60';
          let badgeClass = 'border-black/15 bg-paper text-black/50';
          let statusTag: React.ReactNode = null;

          if (isCorrect) {
            btnClass = 'border-ok bg-ok/5 text-black font-semibold';
            badgeClass = 'border-ok bg-ok text-white';
            statusTag = (
              <View className="flex-row items-center gap-1 rounded bg-ok/10 px-2 py-0.5">
                <Check size={12} color="#0A7A3D" strokeWidth={3} />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#0A7A3D' }}>
                  সঠিক উত্তর
                </Text>
              </View>
            );
          } else if (isPicked) {
            if (!q.correct_answer) {
              btnClass = 'border-black/30 bg-black/[0.04] text-black font-semibold';
              badgeClass = 'border-black bg-ink text-white';
              statusTag = (
                <View className="flex-row items-center gap-1 rounded bg-black/10 px-2 py-0.5">
                  <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#0A0A0A' }}>
                    আপনার উত্তর
                  </Text>
                </View>
              );
            } else {
              btnClass = 'border-accent bg-accent/5 text-black';
              badgeClass = 'border-accent bg-accent text-white';
              statusTag = (
                <View className="flex-row items-center gap-1 rounded bg-accent/10 px-2 py-0.5">
                  <X size={12} color="#EA0000" strokeWidth={3} />
                  <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#EA0000' }}>
                    আপনার উত্তর
                  </Text>
                </View>
              );
            }
          }

          return (
            <View
              key={k}
              className={`flex-row items-center gap-3 rounded-lg border p-3 ${btnClass}`}>
              <View className={`h-6 w-6 items-center justify-center rounded-full border ${badgeClass}`}>
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>{k}</Bn>
              </View>
              <MathText className="flex-1" style={{ fontFamily: FONT.ui, fontSize: 14.5 }} text={txt} />
              {statusTag}
            </View>
          );
        })}
      </View>

      {/* Explanation / Solve Note */}
      {q.solve_note || (q.solve_note_image_urls && q.solve_note_image_urls.length > 0) ? (
        <View className="mt-3">
          <Pressable
            onPress={() => setShowNote((v) => !v)}
            className="flex-row items-center gap-1.5 py-1">
            <Text className="text-black/60 hover:text-black" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
              {showNote ? 'ব্যাখ্যা লুকান' : 'ব্যাখ্যা দেখুন'}
            </Text>
          </Pressable>

          {showNote ? (
            <View className="mt-2 rounded-lg border border-black/10 bg-paper p-4">
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 13, color: '#0A0A0A', marginBottom: 4 }}>
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
  const isWide = width >= 768;

  return (
    <View className="gap-6">
      <Breadcrumb
        trail={[
          { label: 'হোম', href: '/' },
          { label: 'মক এক্সাম', onPress: () => st.backToPicker() },
          { label: 'ফলাফল' },
        ]}
      />

      {/* Header section matching app's standard editorial header */}
      <View className="border-b border-black/10 pb-5">
        <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View>
            <Text style={{ fontFamily: FONT.displayBlack, fontSize: 26, lineHeight: 34 }}>
              মক টেস্ট ফলাফল ও পর্যালোচনা
            </Text>
            <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14, marginTop: 4 }}>
              {`${r.label} — ভুল উত্তরে −০.৫০ নেগেটিভ মার্কিং হিসাব করা হয়েছে`}
              {r.auto ? ' · সময় শেষে স্বয়ংক্রিয় জমা' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Score & Metrics Board — Single crisp, neat, and clean card */}
      <View className="rounded-xl border border-black/10 bg-surface p-6 sm:p-7">
        <View className={isWide ? 'flex-row items-center gap-8' : 'gap-6'}>
          {/* Left score column */}
          <View className={isWide ? 'flex-1 border-r border-black/10 pr-8' : 'border-b border-black/10 pb-6'}>
            <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
              প্রাপ্ত নিট স্কোর
            </Text>
            <View className="flex-row items-baseline gap-2 mt-1">
              <Text style={{ fontFamily: FONT.displayBlack, fontSize: 44, lineHeight: 48, color: '#0A0A0A' }}>
                {toBn(r.score % 1 === 0 ? `${r.score}` : r.score.toFixed(2))}
              </Text>
              <Text className="text-black/30" style={{ fontFamily: FONT.display, fontSize: 24 }}>
                /
              </Text>
              <Text className="text-black/50" style={{ fontFamily: FONT.display, fontSize: 22 }}>
                {toBn(total)}
              </Text>
            </View>

            <Text className="text-black/60 mt-2" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              {`নির্ভুলতা ${toBn(acc)}% · ${toBn(attempted)}টি প্রশ্নের উত্তর দিয়েছেন`}
            </Text>

            {/* Clean, disciplined ratio progress bar */}
            <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5 flex-row">
              {r.right > 0 ? (
                <View className="h-full bg-ok" style={{ width: `${(r.right / total) * 100}%` }} />
              ) : null}
              {r.wrong > 0 ? (
                <View className="h-full bg-accent" style={{ width: `${(r.wrong / total) * 100}%` }} />
              ) : null}
            </View>
          </View>

          {/* Right stat columns — Clean metrics */}
          <View className={isWide ? 'flex-1 flex-row gap-6' : 'flex-row justify-between gap-4'}>
            <View className="flex-1">
              <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12, marginBottom: 4 }}>
                সঠিক উত্তর
              </Text>
              <Text style={{ fontFamily: FONT.digitsBold, fontSize: 24, color: '#0A7A3D' }}>
                {`+${toBn(r.right)}`}
              </Text>
              <Text className="text-black/40 mt-0.5" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                {`${toBn(total ? Math.round((r.right / total) * 100) : 0)}% সফল`}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12, marginBottom: 4 }}>
                ভুল উত্তর
              </Text>
              <Text style={{ fontFamily: FONT.digitsBold, fontSize: 24, color: '#EA0000' }}>
                {`-${toBn(r.wrong)}`}
              </Text>
              <Text className="text-black/40 mt-0.5" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                {`−${toBn(r.wrong * 0.5)} নম্বর`}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12, marginBottom: 4 }}>
                ফাঁকা / বাকি
              </Text>
              <Text style={{ fontFamily: FONT.digitsBold, fontSize: 24, color: '#0A0A0A' }}>
                {toBn(r.skipped)}
              </Text>
              <Text className="text-black/40 mt-0.5" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                {`${toBn(total ? Math.round((r.skipped / total) * 100) : 0)}% বাকি`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Subject-wise Accuracy */}
      <View className="mt-2">
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 17, marginBottom: 8, color: '#0A0A0A' }}>
          বিষয়ভিত্তিক নির্ভুলতা ও বিশ্লেষণ
        </Text>
        <View className="rounded-xl border border-black/10 bg-surface p-5">
          {Object.keys(r.bySubject).length ? (
            Object.entries(r.bySubject).map(([sid, d]) => {
              const subAcc = Math.round((d.correct / Math.max(1, d.attempted)) * 100);
              return (
                <View key={sid} className="border-b border-black/5 py-3 last:border-b-0">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>{subjectName(parseInt(sid, 10))}</Text>
                    <Text style={{ fontFamily: FONT.digitsBold, fontSize: 13, color: '#0A0A0A' }}>
                      {`সঠিক: ${toBn(d.correct)} / ${toBn(d.attempted)}`}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                      {`মোট উত্তর: ${toBn(d.attempted)}টি · ভুল: ${toBn(Math.max(0, d.attempted - d.correct))}টি`}
                    </Text>
                    <Text className="text-black/70 font-semibold" style={{ fontFamily: FONT.digitsBold, fontSize: 12 }}>
                      {`নির্ভুলতা ${toBn(subAcc)}%`}
                    </Text>
                  </View>
                  <View className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden mt-2">
                    <View className="h-full bg-ok" style={{ width: `${subAcc}%` }} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
              কোনো মূল্যায়নযোগ্য উত্তর নেই।
            </Text>
          )}
        </View>
      </View>

      {/* Answer Sheet Review */}
      <View className="mt-2">
        <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
          <View>
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, color: '#0A0A0A' }}>
              {`সম্পূর্ণ উত্তরপত্র পর্যালোচনা (${toBn(r.review.length)})`}
            </Bn>
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginTop: 2 }}>
              সকল প্রশ্নের সঠিক-ভুল উত্তর ও বিস্তারিত ব্যাখ্যা দেখে নিন:
            </Text>
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

      {/* Bottom Action Controls */}
      <View className="mt-4 flex-row flex-wrap gap-3">
        <Pressable
          onPress={onRetry}
          className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 transition-opacity active:opacity-90">
          <RotateCcw size={15} color="#FFFFFF" />
          <Text className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 15 }}>
            আবার পরীক্ষা দিন
          </Text>
        </Pressable>

        <Pressable
          onPress={() => st.backToPicker()}
          className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-lg border border-black/20 bg-surface px-5 py-3 transition-colors hover:bg-black/[0.03]">
          <Text className="text-black/75" style={{ fontFamily: FONT.uiSemi, fontSize: 15 }}>
            মক টেস্ট তালিকায় ফিরুন
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
