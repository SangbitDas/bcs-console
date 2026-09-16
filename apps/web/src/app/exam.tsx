import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight, BookOpen, Clock, FileText, Settings, Target } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { ERAS, SUBJECT_COUNT, TIME_PRESETS, examLabel, examMinutes, examNum, optText, shuffle, slugsInRange, toBn, type QuestionRow } from '../lib/format';
import { useLibrary, type MockRerunConfig } from '../lib/library';
import { useExams, useQuestionPool, useSubjects } from '../hooks/queries';
import { useExamStore, type ExamSource } from '../store/exam';
import { Btn, Bn, Chip, Feedback, OptBtn, Tag, TimerBar, Palette, type OptState } from '../components/ui';
import { BcsTickPicker, Breadcrumb, Cols, DropdownSelect, RadioCircleOption, RadioPill, RecentPracticeRow, ReviewToggle, SidebarLayout, SubjectDropdown } from '../components/patterns';

const OPT_KEYS = ['A', 'B', 'C', 'D'];

const MOCK_SOURCES: { value: ExamSource; label: string }[] = [
  { value: 'full', label: 'পূর্ণ সিলেবাস' },
  { value: 'exam', label: 'বিসিএস পরীক্ষা' },
  { value: 'subject', label: 'বিষয়' },
  { value: 'custom', label: 'নিজের পরীক্ষা তৈরি করুন' },
];

export default function Exam() {
  const st = useExamStore();
  const lib = useLibrary();
  const { data: subjects } = useSubjects();
  const { data: exams } = useExams();
  const c = st.config;



  const poolSlugs = useMemo(() => {
    if (!exams) return [];
    if (c.source === 'exam' && c.exam) return [c.exam];
    if (c.exams.length) {
      const set = new Set(c.exams);
      return exams
        .filter((e) => set.has(e.slug))
        .sort((a, b) => examNum(a.slug) - examNum(b.slug))
        .map((e) => e.slug);
    }
    return slugsInRange(c.fromN, c.toN, exams);
  }, [exams, c.source, c.exam, c.exams, c.fromN, c.toN]);

  const poolSubjects = c.subjects.length ? c.subjects : undefined;

  const pool = useQuestionPool({
    key: st.poolKey || 'idle',
    slugs: poolSlugs,
    subjectIds: poolSubjects,
    enabled: !!st.poolKey,
  });

  const session = useMemo(() => {
    const p = pool.data ?? [];
    const ordered = c.order === 'random' ? shuffle(p) : p;
    return c.count != null ? ordered.slice(0, c.count) : ordered;
  }, [pool.data, c.count, c.order, st.poolKey]);

  /* when pool arrives, start the clock */
  const initKey = useRef('');
  useEffect(() => {
    if (st.poolKey && pool.data && initKey.current !== st.poolKey && !st.result) {
      initKey.current = st.poolKey;
      const mins = c.minutes ?? examMinutes(null, session.length || 100);
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
    const picked = c.exams.length
      ? `${toBn(c.exams.length)}টি বাছাই`
      : 'সব পরীক্ষা';
    const label =
      c.source === 'exam' && c.exam
        ? examLabel(c.exam)
        : c.source === 'full'
          ? 'ফুল সিলেবাস'
          : `${picked}${c.subjects.length ? ' · ' + c.subjects.map(subjectName).join(', ') : ''}`;
    s.setResult({
      score: right - wrong * 0.25,
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
      mockRerun: { source: c.source, exam: c.exam, exams: c.exams, fromN: c.fromN, toN: c.toN, subjects: c.subjects, count: c.count, minutes: c.minutes, order: c.order },
    });
  }

  const applyMockRerun = (r: MockRerunConfig) => {
    st.setConfig({ ...r });
    beginWith(r);
  };

  const beginWith = (cfg: typeof c) => {
    const key = JSON.stringify({ ...cfg, t: Date.now() });
    st.begin(key);
  };

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <View
        className={`mx-auto w-full px-5 py-8 ${
          !st.poolKey ? 'max-w-[1100px]' : 'max-w-[1200px]'
        }`}>
        {!st.poolKey ? (
          <ConfigView
            exams={exams ?? []}
            subjects={subjects ?? []}
            onRerun={applyMockRerun}
            onStart={() => beginWith(c)}
          />
        ) : st.result ? (
          <ExamResultView list={session} subjectName={subjectName} onRetry={() => st.backToPicker()} />
        ) : pool.isPending ? (
          <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 15, marginTop: 16 }}>প্রশ্নপত্র তৈরি হচ্ছে…</Text>
        ) : pool.isError || !session.length ? (
          <View className="border border-dashed border-black/20 bg-surface p-8">
            <Text className="text-center text-black/70" style={{ fontFamily: FONT.ui, fontSize: 15 }}>
              এই নির্বাচনে কোনো প্রশ্ন পাওয়া যায়নি।
            </Text>
            <View className="mt-4">
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

/* ================= Config (with sidebar) ================= */
function ConfigView({
  exams,
  subjects,
  onRerun,
  onStart,
}: {
  exams: { slug: string; title: string; total_marks: number; total_questions: number }[];
  subjects: { id: number; subject_bn: string }[];
  onRerun: (r: MockRerunConfig) => void;
  onStart: () => void;
}) {
  const st = useExamStore();
  const lib = useLibrary();
  const c = st.config;
  const recents = lib.recents.filter((r) => r.kind === 'mock').slice(0, 3);

  const examNumOptions = useMemo(() => {
    return Array.from({ length: 41 }, (_, i) => 10 + i).map((n) => ({
      value: n,
      label: `${toBn(n)}তম`,
    }));
  }, []);

  const countOptions = [200, 150, 100, 50, 30, 20, 10].map((n) => ({
    value: n,
    label: toBn(n),
  }));

  const timeOptions = [
    { value: 120, label: '১২০ মিনিট' },
    { value: 100, label: '১০০ মিনিট' },
    { value: 90, label: '৯০ মিনিট' },
    { value: 60, label: '৬০ মিনিট' },
    { value: 30, label: '৩০ মিনিট' },
    { value: 15, label: '১৫ মিনিট' },
    { value: -1, label: 'স্বয়ংক্রিয়' },
  ];

  const metaMins = c.minutes != null ? `${toBn(c.minutes)} মিনিট` : '১২০ মিনিট';
  const metaCount = c.count != null ? `${toBn(c.count)}` : '২০০';
  const metaSrc = c.source === 'exam' && c.exam
    ? examLabel(c.exam)
    : c.exams.length === 0 || (exams && c.exams.length === exams.length)
      ? 'সব বিসিএস (১০ম–৫০তম)'
      : `${toBn(c.exams.length)}টি বিসিএস`;

  /* Sidebar: summary + recent mocks */
  const sidebar = (
    <View className="gap-4">
      {/* Summary stats */}
      <View className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm">
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 12 }}>পরীক্ষার সারসংক্ষেপ</Text>
        {[
          ['সময়', metaMins],
          ['প্রশ্ন সংখ্যা', `${metaCount}টি`],
          ['উৎস', metaSrc],
          ['বিষয়', c.subjects.length ? `${toBn(c.subjects.length)}টি নির্বাচিত` : 'সব বিষয়'],
          ['ধরন', c.order === 'random' ? 'দৈবচয়ন' : 'ক্রম অনুযায়ী'],
        ].map(([l, v]) => (
          <View key={l} className="mb-3 border-b border-black/10 pb-3">
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12, marginBottom: 2 }}>{l}</Text>
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>{v}</Bn>
          </View>
        ))}
        <Pressable
          onPress={onStart}
          className="min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-lg bg-ink px-5 transition-opacity active:opacity-90">
          <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>
            মক পরীক্ষা শুরু করুন
          </Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Meta icons strip */}
      <View className="gap-2 rounded-xl border border-black/10 bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <Clock size={15} color="rgba(0,0,0,0.5)" />
          <Bn className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            {`সময়: ${metaMins}`}
          </Bn>
        </View>
        <View className="flex-row items-center gap-2">
          <FileText size={15} color="rgba(0,0,0,0.5)" />
          <Bn className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            {`প্রশ্ন সংখ্যা: ${metaCount}`}
          </Bn>
        </View>
        <View className="flex-row items-center gap-2">
          <BookOpen size={15} color="rgba(0,0,0,0.5)" />
          <Bn className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            {`উৎস: ${metaSrc}`}
          </Bn>
        </View>
      </View>

      {/* Recent Mocks */}
      {recents.length > 0 ? (
        <View>
          <Text style={{ fontFamily: FONT.uiBold, fontSize: 15, marginBottom: 8 }}>
            সাম্প্রতিক মক
          </Text>
          <View className="overflow-hidden rounded-xl border border-black/10 bg-surface">
            {recents.map((r) => (
              <RecentPracticeRow
                key={r.id}
                title={r.label}
                sub="মক পরীক্ষা"
                scoreText={`${toBn(r.right)}/${toBn(r.total)} সঠিক`}
                pctText={`${toBn(Math.round((r.right / Math.max(1, r.total)) * 100))}%`}
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
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'মক পরীক্ষা' }]} />

      <SidebarLayout sidebar={sidebar} sidebarWidth={300}>
        {/* Main Content: Form */}
        <View>
          {/* Red accent line */}
          <View className="mb-3 h-1 w-10 rounded-full bg-[#EA0000]" />

          {/* Title & Subtitle */}
          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 36, lineHeight: 46, marginBottom: 8 }}>
            মক পরীক্ষা
          </Text>
          <Text
            className="text-black/70"
            style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 24, marginBottom: 24 }}>
            বাস্তব পরীক্ষার মতো পরিবেশ নিজেকে যাচাই করুন।{'\n'}নির্দিষ্ট সময়ে নির্দিষ্ট সংখ্যক প্রশ্নের উত্তর দিন।
          </Text>

          {/* Unified Form Card */}
          <View className="overflow-hidden rounded-xl border border-black/15 bg-surface shadow-sm">
            {/* ১. প্রশ্নের উৎস */}
            <View className="border-b border-black/10 p-5">
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>১. প্রশ্নের উৎস</Bn>
              <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 14 }}>
                কোন উৎস থেকে প্রশ্ন নিতে চান তা নির্বাচন করুন।
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {MOCK_SOURCES.map((src) => (
                  <RadioPill
                    key={src.value}
                    label={src.label}
                    selected={c.source === src.value}
                    onPress={() => st.setConfig({ source: src.value })}
                  />
                ))}
              </View>
            </View>

            {/* ২. বিসিএস পরিসর - টিক মার্ক সিস্টেম বা একক পরীক্ষা */}
            {c.source === 'exam' ? (
              <View className="border-b border-black/10 p-5">
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>২. বিসিএস পরীক্ষা</Bn>
                <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                  কোন বিসিএস পরীক্ষার প্রশ্নপত্র বেছে নিতে চান?
                </Text>
                <DropdownSelect
                  value={c.exam || (exams?.[0]?.slug ?? '')}
                  options={(exams ?? []).map((e) => ({ value: e.slug, label: examLabel(e.slug) }))}
                  onChange={(val) => st.setConfig({ exam: String(val) })}
                  label={c.exam ? examLabel(c.exam) : 'পরীক্ষা বেছে নিন'}
                />
              </View>
            ) : (
              <BcsTickPicker
                exams={exams ?? []}
                selected={c.exams}
                onToggle={(slug) => st.toggleExam(slug)}
                onSelectAll={() => exams && st.selectAllExams(exams.map((e) => e.slug))}
                onClear={() => st.clearExams()}
                title="২. বিসিএস পরিসর"
                subtitle="কোন বিসিএসের প্রশ্ন অন্তর্ভুক্ত করবেন? পছন্দমতো টিক দিন।"
              />
            )}

            {/* Row: ৩. প্রশ্ন সংখ্যা & ৪. সময় */}
            <View className="flex-row border-b border-black/10">
              <View className="flex-1 border-r border-black/10 p-5">
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৩. প্রশ্ন সংখ্যা</Bn>
                <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                  মোট কতটি প্রশ্ন চান?
                </Text>
                <DropdownSelect
                  value={c.count ?? 200}
                  options={countOptions}
                  onChange={(val) => st.setConfig({ count: Number(val) })}
                  label={c.count != null ? toBn(c.count) : '২০০'}
                />
              </View>
              <View className="flex-1 p-5">
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৪. সময়</Bn>
                <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                  মোট কত মিনিট সময় থাকবে?
                </Text>
                <DropdownSelect
                  value={c.minutes ?? -1}
                  options={timeOptions}
                  onChange={(val) => st.setConfig({ minutes: val === -1 ? null : Number(val) })}
                  label={c.minutes != null ? `${toBn(c.minutes)} মিনিট` : 'স্বয়ংক্রিয়'}
                />
              </View>
            </View>

            {/* ৫. বিষয় নির্বাচন */}
            <View className="border-b border-black/10 p-5">
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৫. বিষয় নির্বাচন</Bn>
              <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                কোন বিষয়গুলো অন্তর্ভুক্ত করতে চান? (সবগুলো বা নির্দিষ্ট বিষয়)
              </Text>
              <SubjectDropdown
                subjects={subjects}
                counts={SUBJECT_COUNT}
                selected={c.subjects}
                onToggle={(id) => st.toggleSubject(id)}
                onSelectAll={() => st.setConfig({ subjects: subjects.map((s) => s.id) })}
                onClear={() => st.setConfig({ subjects: [] })}
              />
            </View>

            {/* ৬. প্রশ্নের ধরন */}
            <View className="p-5">
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৬. প্রশ্নের ধরন</Bn>
              <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 14 }}>
                প্রশ্নগুলো কীভাবে বাছাই হবে?
              </Text>
              <View className="flex-row items-center gap-8">
                <RadioCircleOption
                  label="দৈবচয়ন (Random)"
                  selected={c.order === 'random'}
                  onPress={() => st.setConfig({ order: 'random' })}
                />
                <RadioCircleOption
                  label="ক্রম অনুযায়ী (Sequential)"
                  selected={c.order === 'seq'}
                  onPress={() => st.setConfig({ order: 'seq' })}
                />
              </View>
            </View>
          </View>

          {/* Main Submit Button */}
          <Pressable
            onPress={onStart}
            className="mt-5 min-h-[52px] w-full flex-row items-center justify-center gap-2 rounded-lg bg-ink px-6 transition-opacity active:opacity-90">
            <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>
              মক পরীক্ষা শুরু করুন
            </Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </SidebarLayout>
    </View>
  );
}

/* ================= Runner ================= */
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
  const q = list[st.idx];
  if (!q) return null;
  const noAns = !q.correct_answer;
  const answeredCount = Object.keys(st.answers).length;
  const marked = !!st.marked[st.idx];

  return (
    <View className="gap-4">
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'মক পরীক্ষা', onPress: () => st.backToPicker() }, { label: 'পরীক্ষা চলছে' }]} />
      <TimerBar
        exam={st.config.source === 'exam' && st.config.exam ? examLabel(st.config.exam) : 'কাস্টম মক'}
        marks={`পূর্ণমান ${toBn(list.filter((x) => x.correct_answer).length)}`}
        remain={st.remain}
        answered={answeredCount}
        total={list.length}
      />
      <Cols min={320} weights={[2, 1]}>
      <View className="border border-black/10 bg-surface p-5">
        <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Tag>{subjectName(q.subject_id)}</Tag>
            {noAns ? <Tag warn>উৎসে উত্তর নেই</Tag> : null}
          </View>
          <Text className="text-black/50" style={{ fontFamily: FONT.digits, fontSize: 12 }}>
            {toBn(st.idx + 1)}/{toBn(list.length)}
          </Text>
        </View>
        <View className="mb-4 h-1 bg-black/10">
          <View className="h-1 bg-ink" style={{ width: `${((st.idx + 1) / list.length) * 100}%` }} />
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 20, lineHeight: 32, marginBottom: q.question ? 12 : 0 }}>
          {q.question || '(ছবিতে প্রশ্ন দেখুন)'}
        </Bn>
        {(q.question_image_urls ?? []).map((u) => (
          <View key={u} className="mb-4 items-center border border-black/10 bg-white p-3">
            <Image source={{ uri: u }} style={{ width: '100%', height: 240 }} contentFit="contain" />
          </View>
        ))}
        <View className="gap-2.5">
          {OPT_KEYS.map((k) => {
            const txt = optText(q, k);
            const disabled = noAns || !txt;
            let state: OptState = 'idle';
            if (st.answers[st.idx] === k) state = 'selected';
            else if (disabled) state = 'disabled';
            return <OptBtn key={k} k={k} text={txt} state={state} onPress={() => st.answer(st.idx, k)} />;
          })}
        </View>
        <View className="mt-5 flex-row flex-wrap justify-between gap-2 border-t border-black/10 pt-5">
          <View className="flex-row gap-2">
            <Btn title="← আগের" disabled={st.idx === 0} onPress={() => st.goto(st.idx - 1)} />
            <Btn title="পরের →" disabled={st.idx === list.length - 1} onPress={() => st.goto(st.idx + 1)} />
          </View>
          <View className="flex-row gap-2">
            <ReviewToggle active={marked} onPress={() => st.toggleMarked(st.idx)} />
            <Btn title="মুছুন" onPress={() => st.clear(st.idx)} />
          </View>
        </View>
      </View>

      <View className="border border-black/10 bg-surface p-5">
        <Bn className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 14, marginBottom: 12 }}>
          {`প্রশ্নপত্র · ${toBn(answeredCount)}/${toBn(list.length)} উত্তর`}
        </Bn>
        <Palette
          total={list.length}
          current={st.idx}
          answered={(i) => st.answers[i] !== undefined}
          noAnswer={(i) => !list[i].correct_answer}
          marked={(i) => !!st.marked[i]}
          onJump={(i) => st.goto(i)}
        />
        <View className="mt-4 flex-row items-center justify-between gap-2">
          <Text className="text-accent" style={{ fontFamily: FONT.ui, fontSize: 12 }}>ভুলে −০.২৫</Text>
          <Btn
            title={`জমা দিন${answeredCount < list.length ? ` (${toBn(list.length - answeredCount)} বাকি)` : ''}`}
            variant="accent"
            onPress={() => onSubmit(false)}
          />
        </View>
      </View>
      </Cols>
    </View>
  );
}

/* ================= Result ================= */
function ExamResultView({
  list,
  subjectName,
  onRetry,
}: {
  list: QuestionRow[];
  subjectName: (id: number) => string;
  onRetry: () => void;
}) {
  const st = useExamStore();
  const r = st.result;
  if (!r) return null;
  const byId = new Map(list.map((qq) => [qq.id, qq]));

  return (
    <View className="gap-4">
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'মক পরীক্ষা', onPress: () => st.backToPicker() }, { label: 'ফলাফল' }]} />
      <View className="items-center border border-black bg-surface p-8">
        <Bn bold style={{ fontFamily: FONT.displayBlack, fontSize: 40 }}>
          {`${r.score.toLocaleString('en-US')} / ${r.scorable}`}
        </Bn>
        <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 14, marginTop: 6 }}>
          {`${r.label} — ফলাফল${r.auto ? ' · সময় শেষে স্বয়ংক্রিয় জমা' : ''}`}
        </Bn>
      </View>
      <View className="flex-row flex-wrap border border-black/10 bg-surface">
        {[
          ['সঠিক', toBn(r.right), true, false],
          ['ভুল', toBn(r.wrong), false, true],
          ['ফাঁকা', toBn(r.skipped), false, false],
          ['নেগেটিভ', `-${toBn(r.wrong * 0.25)}`, false, true],
        ].map(([l, v, good, bad]) => (
          <View key={l as string} className="min-w-[40%] flex-1 items-center p-4">
            <Text className={good ? 'text-ok' : bad ? 'text-accent' : ''} style={{ fontFamily: FONT.digits, fontSize: 24, fontWeight: '700' }}>
              {v}
            </Text>
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>{l}</Text>
          </View>
        ))}
      </View>
      <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, marginTop: 8 }}>বিষয়ভিত্তিক নির্ভুলতা</Bn>
      {Object.keys(r.bySubject).length ? (
        Object.entries(r.bySubject).map(([sid, d]) => {
          const acc = Math.round((d.correct / Math.max(1, d.attempted)) * 100);
          return (
            <View key={sid} className="mb-3">
              <View className="mb-1 flex-row justify-between">
                <Text style={{ fontFamily: FONT.ui, fontSize: 14 }}>{subjectName(parseInt(sid, 10))}</Text>
                <Text style={{ fontFamily: FONT.digits, fontSize: 13 }}>{toBn(acc)}%</Text>
              </View>
              <View className="h-2 bg-black/10">
                <View className="h-2 bg-accent" style={{ width: `${acc}%` }} />
              </View>
            </View>
          );
        })
      ) : (
        <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 14 }}>কোনো মূল্যায়নযোগ্য উত্তর নেই।</Text>
      )}
      <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, marginTop: 8 }}>উত্তরপত্র পর্যালোচনা</Bn>
      {r.review.length ? (
        r.review.map((rv) => {
          const q = byId.get(rv.qid);
          if (!q) return null;
          return (
            <View key={rv.qid} className="border-b border-black/10 py-4">
              <View className="mb-2 flex-row flex-wrap gap-2">
                <Tag>{`${examLabel(q.exam_slug)} · প্রশ্ন ${toBn(q.question_number)}`}</Tag>
                <Tag>{subjectName(q.subject_id)}</Tag>
                {rv.st === 'marked' ? <Tag warn>রিভিউ চিহ্নিত</Tag> : null}
              </View>
              <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, marginBottom: 6 }}>
                {q.question || '(ছবির প্রশ্ন)'}
              </Bn>
              {(q.question_image_urls ?? []).map((u) => (
                <View key={u} className="mb-2 border border-black/10 bg-white p-2" style={{ maxWidth: 420 }}>
                  <Image source={{ uri: u }} style={{ width: '100%', height: 180 }} contentFit="contain" />
                </View>
              ))}
              <Bn className={rv.st === 'wrong' ? 'text-accent' : 'text-ok'} style={{ fontFamily: FONT.ui, fontSize: 14, marginBottom: 2 }}>
                {rv.st === 'skip'
                  ? 'আপনার উত্তর: ফাঁকা রাখা হয়েছে'
                  : `আপনার উত্তর: ${rv.pick} — ${optText(q, rv.pick ?? '')}`}
              </Bn>
              <Bn className="text-ok" style={{ fontFamily: FONT.ui, fontSize: 14, marginBottom: 6 }}>
                {`সঠিক উত্তর: ${q.correct_answer} — ${optText(q, q.correct_answer ?? '')}`}
              </Bn>
              {!!q.solve_note || !!(q.solve_note_image_urls ?? []).length ? (
                <Feedback
                  kind="info"
                  title="ব্যাখ্যা"
                  note={q.solve_note || undefined}
                  images={q.solve_note_image_urls}
                />
              ) : null}
            </View>
          );
        })
      ) : (
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>সবগুলো সঠিক — চমৎকার!</Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        <Btn title="নতুন মক পরীক্ষা" variant="dark" onPress={onRetry} />
      </View>
    </View>
  );
}
