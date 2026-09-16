import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { AlertTriangle, ArrowRight, Bookmark, BookOpen, Check, ChevronRight, Eye, EyeOff, FileText, Filter, Settings, Target, Zap } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { ERAS, SUBJECT_COUNT, examLabel, examNum, optText, shuffle, slugsInRange, toBn, type QuestionRow } from '../lib/format';
import { useLibrary, type RerunConfig } from '../lib/library';
import { useExams, useQuestionPool, useSubjects } from '../hooks/queries';
import { usePracticeStore, type PracticeMode } from '../store/practice';
import { Btn, Bn, Chip, Feedback, OptBtn, ScorePanel, Tag, type OptState } from './ui';
import { BookmarkBtn, BcsTickPicker, Breadcrumb, Card, Cols, CountPicker, DropdownSelect, GoRow, ModeCard, NotesCard, QuoteCard, RadioCircleOption, RangePicker, RecentPracticeRow, RecentRow, SegControl, SidebarLayout, SidebarNavItem, SummaryCard } from './patterns';
import { SUBJECT_ICONS } from '../app/index';

const OPT_KEYS = ['A', 'B', 'C', 'D'];

/* Long lists (e.g. Bangla subject = 1008 Qs) are virtualized with FlashList:
   only ~20-30 cards are mounted while the user keeps continuous scroll.
   Cards subscribe to their own Zustand slice so answering one card never
   re-renders the rest. */

/* Display-ready row, normalized ONCE per filter change (not per render). */
export interface DisplayItem {
  q: QuestionRow;
  indexLabel: string;
  subjectLabel: string;
  examBadge?: string;
}

export const QuestionCard = memo(function QuestionCard({
  q,
  indexLabel,
  subjectLabel,
  examBadge,
  revealAll,
  expanded,
  onToggleNote,
}: {
  q: QuestionRow;
  indexLabel: string;
  subjectLabel: string;
  examBadge?: string;
  revealAll: boolean;
  expanded: boolean;
  onToggleNote: (qid: number) => void;
}) {
  // Subscribe ONLY to this card's answer + bookmark -> other cards don't re-render.
  const done = usePracticeStore((st) => st.done[q.id]);
  const answer = usePracticeStore((st) => st.answer);
  const bookmarked = useLibrary((st) => st.bookmarks.includes(q.id));
  const toggleBookmark = useLibrary((st) => st.toggleBookmark);

  const isAnswered = !!done;
  const showExplanation = revealAll || done?.reveal || expanded;
  const showAnswer = isAnswered || revealAll || expanded;

  return (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface p-5 shadow-sm transition-shadow hover:shadow">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-6 min-w-[26px] items-center justify-center rounded bg-ink px-2">
            <Bn className="text-white font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
              {indexLabel}
            </Bn>
          </View>
          {examBadge ? <Tag>{examBadge}</Tag> : null}
          <Tag>{subjectLabel}</Tag>
          {!q.correct_answer ? <Tag warn>উৎসে উত্তর নেই</Tag> : null}
        </View>
        <View className="flex-row items-center gap-2">
          <BookmarkBtn active={bookmarked} onPress={() => toggleBookmark(q.id)} />
        </View>
      </View>

      <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, lineHeight: 26, marginBottom: q.question ? 14 : 4 }}>
        {q.question || '(ছবিতে প্রশ্ন দেখুন)'}
      </Bn>

      {(q.question_image_urls ?? []).map((u) => (
        <View key={u} className="mb-4 items-center rounded-lg border border-black/10 bg-white p-3">
          <Image source={{ uri: u }} style={{ width: '100%', height: 220 }} contentFit="contain" />
        </View>
      ))}

      <View className="my-2 flex-col gap-2">
        {OPT_KEYS.map((k) => {
          const txt = optText(q, k);
          if (!txt) return null;
          const isPicked = done?.pick === k;
          const isCorrect = q.correct_answer === k;

          let btnClass = 'border-black/15 bg-surface text-black/85';
          let badgeClass = 'border-black/20 bg-paper text-black/70';

          if (showAnswer) {
            if (isCorrect) {
              btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold';
              badgeClass = 'border-emerald-600 bg-emerald-600 text-white';
            } else if (isPicked && !done?.ok) {
              btnClass = 'border-rose-500 bg-rose-50 text-rose-950';
              badgeClass = 'border-rose-500 bg-rose-500 text-white';
            } else {
              btnClass = 'border-black/10 bg-black/[0.015] text-black/50 opacity-60';
              badgeClass = 'border-black/10 bg-paper text-black/40';
            }
          }

          return (
            <Pressable
              key={k}
              onPress={() => answer(q.id, k, k === q.correct_answer)}
              disabled={isAnswered && !revealAll}
              className={`flex-row items-center gap-3 rounded-lg border p-3 transition-colors ${btnClass}`}>
              <View className={`h-6 w-6 items-center justify-center rounded-full border ${badgeClass}`}>
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>{k}</Bn>
              </View>
              <Bn className="flex-1" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
                {txt}
              </Bn>
              {showAnswer && isCorrect ? (
                <Check size={16} color="#059669" strokeWidth={2.5} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-black/5 pt-3">
        <Pressable onPress={() => onToggleNote(q.id)} className="flex-row items-center gap-1.5">
          <Text className="text-black/60 hover:text-black" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
            {showExplanation ? 'ব্যাখ্যা লুকান' : 'ব্যাখ্যা দেখুন'}
          </Text>
        </Pressable>

        {isAnswered && !done.ok && q.correct_answer ? (
          <Bn className="text-rose-600 font-semibold" style={{ fontFamily: FONT.uiBold, fontSize: 12 }}>
            {`সঠিক উত্তর: ${q.correct_answer}`}
          </Bn>
        ) : null}
      </View>

      {showExplanation ? (
        <View className="mt-3 rounded-lg border border-black/10 bg-paper p-4">
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 13, color: '#0A0A0A', marginBottom: 4 }}>
            {`সঠিক উত্তর: ${q.correct_answer || 'উৎসে উত্তর অনুপস্থিত'}`}
          </Bn>
          {q.solve_note ? (
            <Bn style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, color: 'rgba(0,0,0,0.85)' }}>
              {q.solve_note}
            </Bn>
          ) : null}
          {(q.solve_note_image_urls ?? []).map((u) => (
            <View key={u} className="mt-3 items-center rounded border border-black/10 bg-white p-2">
              <Image source={{ uri: u }} style={{ width: '100%', height: 180 }} contentFit="contain" />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

/* Virtualized continuous-scroll list shared by exam + subject views.
   renderItem is stable across answer updates -> only the tapped card re-renders. */
export function QuestionsFlashList({
  items,
  revealAll,
  expandedNotes,
  onToggleNote,
  header,
  empty,
}: {
  items: DisplayItem[];
  revealAll: boolean;
  expandedNotes: Record<number, boolean>;
  onToggleNote: (qid: number) => void;
  header?: React.ReactElement | null;
  empty?: React.ReactElement | null;
}) {
  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => (
      <View className="mb-4">
        <QuestionCard
          q={item.q}
          indexLabel={item.indexLabel}
          subjectLabel={item.subjectLabel}
          examBadge={item.examBadge}
          revealAll={revealAll}
          expanded={!!expandedNotes[item.q.id]}
          onToggleNote={onToggleNote}
        />
      </View>
    ),
    [revealAll, expandedNotes, onToggleNote],
  );
  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={(it) => String(it.q.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      showsVerticalScrollIndicator={true}
    />
  );
}

const MODE_META: Record<Exclude<PracticeMode, 'bookmarks' | 'wrong'>, { title: string; desc: string }> = {
  exam: { title: 'বিসিএস পরীক্ষা', desc: 'একটি পূর্ণ প্রশ্নপত্র বেছে অনুশীলন করুন।' },
  subject: { title: 'বিষয়ভিত্তিক অনুশীলন', desc: 'পছন্দের বিষয়গুলো নির্বাচন করে সরাসরি অনুশীলনে প্রবেশ করুন।' },
  custom: { title: 'নিজের পরীক্ষা তৈরি করুন', desc: 'পরিসর, বিষয়, সংখ্যা ও ধরন নিজে ঠিক করুন।' },
};

export function PracticeScreen({
  initialMode = null,
}: {
  initialMode?: PracticeMode | null;
}) {
  const params = useLocalSearchParams<{ id?: string; subject?: string; exam?: string; mode?: string }>();
  const s = usePracticeStore();
  const lib = useLibrary();
  const { data: subjects } = useSubjects();
  const { data: exams } = useExams();



  useEffect(() => {
    // 1. If we are on the Hub route (/practice), ensure state resets to Hub so browser Back button works
    if (initialMode === null) {
      if (s.mode !== null || s.started) {
        s.backToHub();
      }
      return;
    }

    // 2. If params explicitly specify an exam, subject, or mode, handle that
    const rawSubId = params.id ?? params.subject;
    if (rawSubId) {
      const id = parseInt(String(rawSubId), 10);
      if (!isNaN(id)) {
        if (s.mode !== 'subject' || !s.started || s.subjects.length !== 1 || s.subjects[0] !== id) {
          s.setMode('subject');
          s.setSubjects([id]);
          s.start();
        }
      }
      return;
    }

    if (params.exam) {
      if (s.mode !== 'exam' || s.exam !== params.exam || !s.started) {
        s.setMode('exam');
        s.setExam(String(params.exam));
        s.start();
      }
      return;
    }

    if (params.mode === 'bookmarks' || params.mode === 'wrong') {
      if (s.mode !== params.mode || !s.started) {
        s.setMode(params.mode);
        s.start();
      }
      return;
    }

    // 3. Sub-route mode switching or browser back navigation
    if (initialMode !== undefined && s.mode !== initialMode) {
      s.setMode(initialMode);
    } else if (initialMode === 'exam' && s.started && !params.exam) {
      s.backToPicker();
    } else if (initialMode === 'subject' && s.started && !rawSubId && s.subjects.length <= 1) {
      s.backToPicker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, params.id, params.subject, params.exam, params.mode]);

  const subjectName = useCallback(
    (id: number) => subjects?.find((x) => x.id === id)?.subject_bn ?? `বিষয় ${id}`,
    [subjects],
  );

  /* pool args per mode */
  const poolArgs = useMemo(() => {
    if (!exams) return { key: 'none', enabled: false };
    if (s.mode === 'exam' && s.exam) return { key: `exam-${s.exam}`, slugs: [s.exam], enabled: true };
    if (s.mode === 'subject' && s.started) {
      const subs = s.subjects.length ? s.subjects : undefined;
      const allSlugs = exams.map((e) => e.slug);
      return {
        key: `subject-${allSlugs.length}-${[...s.subjects].sort().join(',')}`,
        slugs: allSlugs,
        subjectIds: subs,
        enabled: (subs?.length ?? 0) > 0,
      };
    }
    if (s.mode === 'custom' && s.started) {
      const slugs = s.exams.length > 0 ? s.exams : slugsInRange(s.fromN, s.toN, exams);
      const subs = s.subjects.length ? s.subjects : undefined;
      return {
        key: `custom-${[...slugs].sort().join(',')}-${[...s.subjects].sort().join(',')}`,
        slugs, subjectIds: subs, enabled: slugs.length > 0,
      };
    }
    if (s.mode === 'bookmarks' && s.started)
      return { key: `bm-${lib.bookmarks.length}`, ids: lib.bookmarks, enabled: lib.bookmarks.length > 0 };
    if (s.mode === 'wrong' && s.started)
      return { key: `wr-${lib.wrongIds.length}`, ids: lib.wrongIds, enabled: lib.wrongIds.length > 0 };
    return { key: 'none', enabled: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mode, s.exam, s.exams, s.subjects, s.fromN, s.toN, s.started, exams, lib.bookmarks.length, lib.wrongIds.length]);

  const pool = useQuestionPool({ ...(poolArgs as { key: string; slugs?: string[]; subjectIds?: number[]; ids?: number[] }), enabled: poolArgs.enabled ?? false });

  const session = useMemo(() => {
    const p = pool.data ?? [];
    const ordered =
      s.order === 'random' && s.mode === 'custom'
        ? shuffle(p)
        : [...p].sort((a, b) => {
            const ea = examNum(a.exam_slug);
            const eb = examNum(b.exam_slug);
            if (ea !== eb) return eb - ea; // Newest BCS exam first (50th down to 10th)
            return a.question_number - b.question_number;
          });
    return s.count != null && s.mode === 'custom' ? ordered.slice(0, s.count) : ordered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.data, s.count, s.order, s.mode, s.runId]);

  const applyRerun = (r: RerunConfig) => {
    if (r.mode === 'bookmarks' || r.mode === 'wrong') {
      s.setMode(r.mode);
      s.start();
      return;
    }
    s.setMode(r.mode);
    s.setExam(r.exam);
    r.subjects.forEach((id) => {
      if (!usePracticeStore.getState().subjects.includes(id)) s.toggleSubject(id);
    });
    s.setRange(r.fromN, r.toN);
    if (exams) {
      s.selectAllExams(slugsInRange(r.fromN, r.toN, exams));
    }
    s.setCount(r.count);
    s.setOrder(r.order);
    s.start();
  };

  const scopeLabel = () => {
    if (s.mode === 'exam') return s.exam ? examLabel(s.exam) : '';
    if (s.mode === 'bookmarks') return 'বুকমার্ক';
    if (s.mode === 'wrong') return 'ভুল হওয়া প্রশ্ন';
    const examPart = s.exams.length > 0 && exams
      ? s.exams.length === exams.length
        ? 'সব বিসিএস'
        : `${toBn(s.exams.length)}টি বিসিএস`
      : `${toBn(Math.min(s.fromN, s.toN))}–${toBn(Math.max(s.fromN, s.toN))}তম`;
    const subs = s.subjects.length
      ? s.subjects.map((id) => subjectName(id)).join(', ')
      : 'সব বিষয়';
    return `${examPart} · ${subs}`;
  };

  const finishSession = () => {
    const wrongIds = Object.entries(s.done)
      .filter(([, d]) => !d.ok && !d.reveal && d.pick)
      .map(([qid]) => parseInt(qid, 10));
    if (wrongIds.length) lib.addWrong(wrongIds);
    lib.pushRecent({
      kind: 'practice',
      label: scopeLabel(),
      total: session.length,
      right: s.right,
      rerun: { mode: s.mode as RerunConfig['mode'], exam: s.exam, subjects: s.subjects, fromN: s.fromN, toN: s.toN, count: s.count, order: s.order },
    });
    s.finish();
  };

  /* Virtualized list modes need a bounded-height container (no outer
     ScrollView) so FlashList can recycle rows instead of mounting all. */
  const isVirtualList =
    s.started && !s.finished && (s.mode === 'exam' || s.mode === 'subject') && !pool.isPending && !pool.isError && session.length > 0;

  if (isVirtualList) {
    return (
      <View className="bg-paper" style={{ flex: 1 }}>
        <View className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8">
          {s.mode === 'exam' ? (
            <ExamAllQuestionsView
              session={session}
              subjects={subjects ?? []}
              subjectName={subjectName}
              examSlug={s.exam}
              onFinish={finishSession}
              onBack={() => { s.backToPicker(); router.push('/practice/exam' as any); }}
            />
          ) : (
            <SubjectAllQuestionsView
              session={session}
              exams={exams ?? []}
              subjectIds={s.subjects}
              subjectName={subjectName}
              onFinish={finishSession}
              onBack={() => { s.backToPicker(); router.push('/practice/subject' as any); }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View
        className={`mx-auto w-full px-5 py-8 ${
          s.started ? 'max-w-[1200px]' : 'max-w-[1100px]'
        }`}>
        {s.mode === null ? (
          <HubView
            exams={exams ?? []}
            subjects={subjects ?? []}
            onMode={(m) => {
              if (m === 'bookmarks' || m === 'wrong') {
                s.setMode(m);
                s.start();
              } else {
                s.setMode(m);
                if (m === 'exam') router.push('/practice/exam' as any);
                else if (m === 'subject') router.push('/practice/subject' as any);
                else if (m === 'custom') router.push('/practice/custom' as any);
              }
            }}
            onRerun={applyRerun}
          />
        ) : !s.started ? (
          <ConfigureView
            exams={exams ?? []}
            subjects={subjects ?? []}
            subjectName={subjectName}
            scopeLabel={scopeLabel()}
          />
        ) : s.finished ? (
          <PracticeResult
            session={session}
            subjectName={subjectName}
            onRetry={() => s.start()}
            onPicker={() => s.backToPicker()}
            onHub={() => { s.backToHub(); router.push('/practice' as any); }}
          />
        ) : pool.isPending ? (
          <View className="py-20 items-center justify-center gap-3">
            <ActivityIndicator size="small" color="#0A0A0A" />
            <Text className="text-black/60" style={{ fontFamily: FONT.uiMed, fontSize: 14 }}>
              প্রশ্ন আনা হচ্ছে…
            </Text>
          </View>
        ) : pool.isError || !session.length ? (
          <View className="mt-4 border border-dashed border-black/20 bg-surface p-8">
            <Text className="text-center text-black/70" style={{ fontFamily: FONT.ui, fontSize: 15 }}>
              এই নির্বাচনে কোনো প্রশ্ন পাওয়া যায়নি। বছর বা বিষয় বদলে আবার চেষ্টা করুন।
            </Text>
            <View className="mt-4 flex-row justify-center gap-2">
              <Btn title="বাছাই বদলান" onPress={s.backToPicker} />
              <Btn title="হাবে ফিরুন" variant="dark" onPress={s.backToHub} />
            </View>
          </View>
        ) : s.mode === 'exam' ? (
          <ExamAllQuestionsView
            session={session}
            subjects={subjects ?? []}
            subjectName={subjectName}
            examSlug={s.exam}
            onFinish={finishSession}
            onBack={() => { s.backToPicker(); router.push('/practice/exam' as any); }}
          />
        ) : s.mode === 'subject' ? (
          <SubjectAllQuestionsView
            session={session}
            exams={exams ?? []}
            subjectIds={s.subjects}
            subjectName={subjectName}
            onFinish={finishSession}
            onBack={() => { s.backToPicker(); router.push('/practice/subject' as any); }}
          />
        ) : (
          <RunnerView session={session} subjectName={subjectName} scope={scopeLabel()} onFinish={finishSession} />
        )}
      </View>
    </ScrollView>
  );
}

/* ================= Hub (Screen 1) — Sidebar layout ================= */
function HubView({
  exams,
  subjects,
  onMode,
  onRerun,
}: {
  exams: { slug: string; total_questions: number }[];
  subjects: { id: number; subject_bn: string }[];
  onMode: (m: PracticeMode) => void;
  onRerun: (r: RerunConfig) => void;
}) {
  const lib = useLibrary();
  const recents = lib.recents.filter((r) => r.kind === 'practice').slice(0, 5);

  const sidebar = (
    <View>
      {/* Brand accent + title */}
      <View className="mb-5">
        <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
        <Text style={{ fontFamily: FONT.displayBlack, fontSize: 28, lineHeight: 36 }}>
          অনুশীলন
        </Text>
        <Text
          className="text-black/60"
          style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
          বিসিএস প্রস্তুতির জন্য পূর্ববর্তী প্রশ্নপত্র থেকে অনুশীলন করুন।
        </Text>
      </View>

      {/* Guide card */}
      <View className="rounded-xl border border-black/10 bg-surface p-4">
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 13, marginBottom: 4 }}>
          প্রস্তুতি নির্দেশিকা
        </Text>
        <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 18 }}>
          ১০ম থেকে ৫০তম বিসিএস পরীক্ষার ৫,৩৫০টি প্রশ্ন বিষয়ভিত্তিক বা পরীক্ষা অনুসারে চর্চা করুন।
        </Text>
      </View>
    </View>
  );

  return (
    <View>
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'অনুশীলন' }]} />

      <SidebarLayout sidebar={sidebar}>
        {/* Main content area */}
        <View>
          {/* অনুশীলনের ধরন বেছে নিন (3 inline cards) */}
          <View className="mb-6">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="h-1 w-3.5 rounded-full bg-[#EA0000]" />
              <Text style={{ fontFamily: FONT.uiBold, fontSize: 17 }}>
                অনুশীলনের ধরন বেছে নিন
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <Pressable
                onPress={() => onMode('exam')}
                className="min-h-[100px] flex-1 basis-[140px] justify-between rounded-xl border border-black/10 bg-surface p-4 transition-colors active:bg-black/[0.02]">
                <FileText size={20} color="#0A0A0A" strokeWidth={1.8} />
                <View className="mt-2">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>বিসিএস পরীক্ষা</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>১০ম–৫০তম</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => onMode('subject')}
                className="min-h-[100px] flex-1 basis-[140px] justify-between rounded-xl border border-black/10 bg-surface p-4 transition-colors active:bg-black/[0.02]">
                <BookOpen size={20} color="#0A0A0A" strokeWidth={1.8} />
                <View className="mt-2">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>বিষয়ভিত্তিক</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>১০টি বিষয়</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => onMode('custom')}
                className="min-h-[100px] flex-1 basis-[140px] justify-between rounded-xl border border-black/10 bg-surface p-4 transition-colors active:bg-black/[0.02]">
                <Settings size={20} color="#0A0A0A" strokeWidth={1.8} />
                <View className="mt-2">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>নিজের পরীক্ষা</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>তৈরি করুন</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* — সাম্প্রতিক অনুশীলন */}
          <View className="mb-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-1 w-3.5 rounded-full bg-[#EA0000]" />
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 17 }}>
                  সাম্প্রতিক অনুশীলন
                </Text>
              </View>
              <Pressable onPress={() => onMode('exam')}>
                <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                  সব দেখুন →
                </Text>
              </Pressable>
            </View>

            <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-sm">
              {recents.length > 0 ? (
                recents.map((r) => (
                  <RecentPracticeRow
                    key={r.id}
                    title={r.label}
                    sub="অনুশীলন"
                    scoreText={`${toBn(r.right)} / ${toBn(r.total)}`}
                    pctText={`${toBn(Math.round((r.right / Math.max(1, r.total)) * 100))}% সম্পন্ন`}
                    pct={(r.right / Math.max(1, r.total)) * 100}
                    onPress={() => r.rerun && onRerun(r.rerun)}
                  />
                ))
              ) : (
                <>
                  <RecentPracticeRow
                    title="৫০তম বিসিএস"
                    sub="পরীক্ষা • ২০০ প্রশ্ন"
                    scoreText="৩৬ / ২০০"
                    pctText="১৮% সম্পন্ন"
                    pct={18}
                    onPress={() => onRerun({ mode: 'exam', exam: '50th_bcs', subjects: [], fromN: 50, toN: 50, count: 200, order: 'seq' })}
                  />
                  <RecentPracticeRow
                    title="৪৯তম বিসিএস"
                    sub="পরীক্ষা • ১০০ প্রশ্ন"
                    scoreText="৬৮ / ১০০"
                    pctText="৬৮% সম্পন্ন"
                    pct={68}
                    onPress={() => onRerun({ mode: 'exam', exam: '49th_bcs', subjects: [], fromN: 49, toN: 49, count: 100, order: 'seq' })}
                  />
                  <RecentPracticeRow
                    title="৪৮তম বিসিএস"
                    sub="পরীক্ষা • ১০০ প্রশ্ন"
                    scoreText="২১ / ১০০"
                    pctText="২১% সম্পন্ন"
                    pct={21}
                    onPress={() => onRerun({ mode: 'exam', exam: '48th_bcs', subjects: [], fromN: 48, toN: 48, count: 100, order: 'seq' })}
                  />
                </>
              )}
            </View>
          </View>

          {/* Quote card */}
          <QuoteCard />
        </View>
      </SidebarLayout>
    </View>
  );
}

/* ================= Configure (Screen 3: নিজের পরীক্ষা তৈরি করুন) ================= */
function ConfigureView({
  exams,
  subjects,
  subjectName,
  scopeLabel,
}: {
  exams: { slug: string; total_questions: number }[];
  subjects: { id: number; subject_bn: string }[];
  subjectName: (id: number) => string;
  scopeLabel: string;
}) {
  const s = usePracticeStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const meta =
    s.mode === 'exam' || s.mode === 'subject' || s.mode === 'custom' ? MODE_META[s.mode] : null;

  const examGroups = ERAS.map((era) => ({
    ...era,
    list: exams
      .filter((e) => {
        const m = e.slug.match(/^(\d+)/);
        const n = m ? parseInt(m[1], 10) : 0;
        return n >= era.from && n <= era.to;
      })
      .sort((a, b) => {
        const na = parseInt(a.slug, 10);
        const nb = parseInt(b.slug, 10);
        return nb - na;
      }),
  }));

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

  const isCustomOrSubject = s.mode === 'custom' || s.mode === 'subject';

  /* Sidebar for config: mode nav + summary */
  const configSidebar = (
    <View className="gap-4">
      {/* Back to hub */}
      <Pressable
        onPress={() => { s.backToHub(); router.push('/practice' as any); }}
        className="flex-row items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2.5">
        <Text style={{ fontSize: 14 }}>←</Text>
        <Text className="text-black/70" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
          অনুশীলন হাবে ফিরুন
        </Text>
      </Pressable>

      {/* Summary card */}
      {s.mode === 'subject' ? (
        <SummaryCard
          rows={[
            ['মোড', 'বিষয়ভিত্তিক অনুশীলন'],
            ['নির্বাচিত বিষয়', s.subjects.length ? `${toBn(s.subjects.length)}টি বিষয়` : 'কোনোটি নির্বাচিত নয়'],
            ['প্রশ্ন পরিসর', '১০ম–৫০তম বিসিএস'],
            ['পদ্ধতি', 'সকল প্রশ্ন এক সাথে'],
          ]}
          cta="অনুশীলনে প্রবেশ করুন →"
          disabled={s.subjects.length === 0}
          onCta={() => s.start()}
          hideCtaOnMobile={true}
        />
      ) : s.mode === 'custom' ? (
        <SummaryCard
          rows={[
            ['বিসিএস পরিসর', s.exams.length === 0 || (exams && s.exams.length === exams.length) ? 'সব বিসিএস (১০ম–৫০তম)' : `${toBn(s.exams.length)}টি বিসিএস`],
            ['বিষয়', s.subjects.length ? `${toBn(s.subjects.length)}টি (নির্বাচিত)` : 'সব বিষয়'],
            ['প্রশ্ন সংখ্যা', s.count != null ? `${toBn(s.count)}টি` : '২০০টি'],
            ['মোড', 'নিজের পরীক্ষা'],
          ]}
          cta="অনুশীলন শুরু করুন →"
          onCta={() => s.start()}
        />
      ) : s.mode === 'exam' ? (
        <SummaryCard
          rows={[
            ['বাছাই', s.exam ? examLabel(s.exam) : 'যেকোনো একটি পরীক্ষা বেছে নিন'],
            ['প্রশ্ন', s.exam ? `${toBn(exams.find((e) => e.slug === s.exam)?.total_questions ?? 0)}টি` : '১০০–২০০টি'],
            ['পদ্ধতি', 'সকল প্রশ্ন এক সাথে'],
          ]}
          cta="প্রশ্নপত্র দেখুন →"
          onCta={() => s.start()}
          disabled={!s.exam}
        />
      ) : null}

      {/* Notes (desktop only) */}
      {isWide ? (
        <NotesCard
          items={
            s.mode === 'subject'
              ? [
                  'এক বা একাধিক বিষয় বেছে নিয়ে অনুশীলনে প্রবেশ করুন।',
                  'ভেতরে প্রবেশের পর পাশের সাইডবার থেকে ১০ম–৫০তম বিসিএস ফিল্টার করতে পারবেন।',
                  'প্রতিটি উত্তরের সাথে বিস্তারিত ব্যাখ্যা ও ছবি দেখতে পারবেন।',
                ]
              : [
                  'নিজের পরীক্ষায় পছন্দের যেকোনো বিষয় ও বিসিএস নির্বাচন করা যায়।',
                  'প্রশ্নগুলো বিসিএসের সিলেবাস ও ট্যাক্সোনমি অনুযায়ী বাছাই করা হবে।',
                  'প্রতিটি উত্তরের সাথে সাথে বিস্তারিত ব্যাখ্যা ও ছবি দেখা যাবে।',
                ]
          }
        />
      ) : null}
    </View>
  );

  return (
    <View>
      <Breadcrumb
        trail={[
          { label: 'হোম', href: '/' },
          { label: 'অনুশীলন', onPress: () => { s.backToHub(); router.push('/practice' as any); } },
          { label: meta?.title ?? '' },
        ]}
      />

      <SidebarLayout sidebar={configSidebar} reverseOnMobile={true}>
        {/* Main content */}
        <View>
          {/* Red accent line */}
          <View className="mb-3 h-1 w-10 rounded-full bg-[#EA0000]" />

          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 32, lineHeight: 44, marginBottom: 8 }}>
            {meta?.title ?? ''}
          </Text>
          <Text
            className="text-black/70"
            style={{ fontFamily: FONT.ui, fontSize: 15, lineHeight: 24, marginBottom: 24 }}>
            {meta?.desc ?? ''}
          </Text>

          {/* Exam selection mode */}
          {s.mode === 'exam' ? (
            <View className="mb-8">
              <Text style={{ fontFamily: FONT.uiBold, fontSize: 17, marginBottom: 12 }}>বিসিএস প্রশ্নপত্র বেছে নিন</Text>
              {examGroups.map((g) =>
                g.list.length ? (
                  <View key={g.label} className="mb-6 rounded-xl border border-black/10 bg-surface p-5 shadow-sm">
                    <Bn className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 14, marginBottom: 12 }}>
                      {`${g.label} (${toBn(g.from)}–${toBn(g.to)}তম)`}
                    </Bn>
                    <View className="flex-row flex-wrap gap-2.5">
                      {g.list.map((e) => {
                        const active = s.exam === e.slug;
                        return (
                          <Chip
                            key={e.slug}
                            main={examLabel(e.slug)}
                            sub={e.total_questions}
                            active={active}
                            onPress={() => {
                              s.setExam(e.slug);
                              s.start();
                              router.push(`/practice/exam?exam=${e.slug}` as any);
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>
                ) : null,
              )}
            </View>
          ) : null}

          {/* Subject Mode: ONLY Subject Name Cards + Enter Button (NO BCS Range card) */}
          {s.mode === 'subject' ? (
            <View className="overflow-hidden rounded-xl border border-black/15 bg-surface shadow-sm">
              <View className="border-b border-black/10 bg-black/[0.02] p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18 }}>বিষয় নির্বাচন করুন</Bn>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (s.subjects.length === subjects.length) {
                        subjects.forEach((sub) => {
                          if (s.subjects.includes(sub.id)) s.toggleSubject(sub.id);
                        });
                      } else {
                        subjects.forEach((sub) => {
                          if (!s.subjects.includes(sub.id)) s.toggleSubject(sub.id);
                        });
                      }
                    }}
                    className="rounded-lg border border-black/10 bg-surface px-3 py-1.5 transition-colors active:bg-black/5">
                    <Text className="text-black/75" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                      {s.subjects.length === subjects.length ? 'সব মুছুন' : 'সব নির্বাচন করুন'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Subject Cards Multi-select Grid */}
              <View className={isWide ? 'p-5' : 'p-3'}>
                <View className="flex-row flex-wrap" style={{ gap: isWide ? 12 : 10 }}>
                  {subjects.map((sub) => {
                    const active = s.subjects.includes(sub.id);
                    const qCount = SUBJECT_COUNT[sub.id] ?? 0;
                    const Icon = SUBJECT_ICONS[sub.id];
                    return (
                      <Pressable
                        key={sub.id}
                        onPress={() => s.toggleSubject(sub.id)}
                        style={
                          (!isWide
                            ? { width: 'calc(50% - 5px)', minHeight: 120 }
                            : { flex: 1, minWidth: 230, minHeight: 96 }) as any
                        }
                        className={`justify-between rounded-xl border p-3 md:p-4 transition-all ${
                          active
                            ? 'border-black bg-ink text-white shadow-sm'
                            : 'border-black/10 bg-surface hover:border-black/30'
                        }`}>
                        <View className="flex-row items-start justify-between gap-1">
                          <View className="flex-row items-center gap-1.5 md:gap-2.5">
                            <View
                              className={`h-5 w-5 items-center justify-center rounded border ${
                                active ? 'border-white bg-white' : 'border-black/30 bg-surface'
                              }`}>
                              {active ? <Check size={14} color="#0A0A0A" strokeWidth={3} /> : null}
                            </View>
                            <View
                              className={`h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg ${
                                active ? 'bg-white/15' : 'bg-black/[0.04]'
                              }`}>
                              {Icon ? <Icon size={isWide ? 15 : 13} color={active ? '#FFFFFF' : '#0A0A0A'} /> : null}
                            </View>
                          </View>
                          <Bn
                            className={active ? 'text-white/70' : 'text-black/45'}
                            style={{ fontFamily: FONT.uiSemi, fontSize: isWide ? 12 : 11 }}>
                            {`${toBn(qCount.toLocaleString('en-US'))}টি প্রশ্ন`}
                          </Bn>
                        </View>
                        <View className="mt-2.5">
                          <Bn
                            numberOfLines={isWide ? 2 : 3}
                            className={active ? 'text-white font-bold' : 'text-black font-semibold'}
                            style={{
                              fontFamily: active ? FONT.uiBold : FONT.uiSemi,
                              fontSize: isWide ? 15.5 : 13.5,
                              lineHeight: isWide ? 22 : 19,
                            }}>
                            {sub.subject_bn}
                          </Bn>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Bottom Action Bar */}
              <View className="flex-row items-center justify-between border-t border-black/10 bg-black/[0.02] p-5">
                <Bn className="text-black/70" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                  {s.subjects.length > 0
                    ? `নির্বাচিত বিষয়: ${toBn(s.subjects.length)}টি`
                    : 'অন্তত একটি বিষয় বেছে নিন'}
                </Bn>
                <Pressable
                  disabled={s.subjects.length === 0}
                  onPress={() => s.start()}
                  className={`flex-row items-center gap-2 rounded-xl px-6 py-3 transition-opacity ${
                    s.subjects.length > 0 ? 'bg-ink opacity-100 shadow-sm' : 'bg-black/20 opacity-50'
                  }`}>
                  <Text className="text-white font-semibold" style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>
                    অনুশীলনে প্রবেশ করুন
                  </Text>
                  <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Custom Practice Builder (Full Controls) */}
          {s.mode === 'custom' ? (
            <View className="overflow-hidden rounded-xl border border-black/15 bg-surface shadow-sm">
              {/* ১. বিসিএস পরিসর - টিক মার্ক সিস্টেম */}
              <BcsTickPicker
                exams={exams ?? []}
                selected={s.exams}
                onToggle={(slug) => s.toggleExam(slug)}
                onSelectAll={() => exams && s.selectAllExams(exams.map((e) => e.slug))}
                onClear={() => s.clearExams()}
                title="১. বিসিএস পরিসর"
                subtitle="কোন বিসিএসের প্রশ্ন অন্তর্ভুক্ত করবেন? পছন্দমতো টিক দিন।"
              />

              {/* ২. বিষয় নির্বাচন */}
              <View className="border-b border-black/10 p-5">
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>২. বিষয় নির্বাচন</Bn>
                    <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
                      পছন্দের বিষয়গুলো বেছে নিন
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (s.subjects.length === subjects.length) {
                        subjects.forEach((sub) => {
                          if (s.subjects.includes(sub.id)) s.toggleSubject(sub.id);
                        });
                      } else {
                        subjects.forEach((sub) => {
                          if (!s.subjects.includes(sub.id)) s.toggleSubject(sub.id);
                        });
                      }
                    }}>
                    <Text className="text-black/70 underline" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                      {s.subjects.length === subjects.length ? 'সব মুছুন' : 'সব নির্বাচন করুন'}
                    </Text>
                  </Pressable>
                </View>

                <View className="rounded-lg border border-black/10 overflow-hidden">
                  {subjects.map((sub) => {
                    const active = s.subjects.includes(sub.id);
                    return (
                      <Pressable
                        key={sub.id}
                        onPress={() => s.toggleSubject(sub.id)}
                        className={`flex-row items-center justify-between border-b border-black/5 px-3.5 py-3 transition-colors ${
                          active ? 'bg-black/[0.03]' : 'bg-surface'
                        }`}>
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`h-5 w-5 items-center justify-center rounded border ${
                              active ? 'border-black bg-ink' : 'border-black/30 bg-surface'
                            }`}>
                            {active ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                          </View>
                          <Bn
                            className={active ? 'text-black font-semibold' : 'text-black/80'}
                            style={{ fontFamily: active ? FONT.uiBold : FONT.uiSemi, fontSize: 14 }}>
                            {sub.subject_bn}
                          </Bn>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Bn className="text-black/45" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                            {`${toBn((SUBJECT_COUNT[sub.id] ?? 0).toLocaleString('en-US'))} প্রশ্ন`}
                          </Bn>
                          <ChevronRight size={16} color="rgba(0,0,0,0.3)" />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ৩. প্রশ্ন সংখ্যা & ৪. প্রশ্নের ধরন */}
              <View className="p-5 flex-row gap-4">
                <View className="flex-1">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৩. প্রশ্ন সংখ্যা</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                    মোট কতটি প্রশ্ন চান?
                  </Text>
                  <DropdownSelect
                    value={s.count ?? 200}
                    options={countOptions}
                    onChange={(val) => s.setCount(Number(val))}
                    label={s.count != null ? toBn(s.count) : '২০০'}
                  />
                </View>

                <View className="flex-1">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 16, marginBottom: 4 }}>৪. প্রশ্নের ধরন</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13, marginBottom: 12 }}>
                    বাছাই পদ্ধতি
                  </Text>
                  <View className="flex-col gap-2 pt-1">
                    <RadioCircleOption
                      label="এলোমেলো (Random)"
                      selected={s.order === 'random'}
                      onPress={() => s.setOrder('random')}
                    />
                    <RadioCircleOption
                      label="ক্রমানুযায়ী (Seq)"
                      selected={s.order === 'seq'}
                      onPress={() => s.setOrder('seq')}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </SidebarLayout>
    </View>
  );
}

/* ================= Exam All Questions View (Full Exam Paper with Subject Tick Filter) ================= */
function ExamAllQuestionsView({
  session,
  subjects,
  subjectName,
  examSlug,
  onFinish,
  onBack,
}: {
  session: QuestionRow[];
  subjects: { id: number; subject_bn: string }[];
  subjectName: (id: number) => string;
  examSlug: string;
  onFinish: () => void;
  onBack: () => void;
}) {
  const backToHub = usePracticeStore((st) => st.backToHub);
  const doneMap = usePracticeStore((st) => st.done);
  const right = usePracticeStore((st) => st.right);
  const wrong = usePracticeStore((st) => st.wrong);

  // Distinct subjects in this exam with counts
  const examSubjects = useMemo(() => {
    const counts: Record<number, number> = {};
    session.forEach((q) => {
      counts[q.subject_id] = (counts[q.subject_id] ?? 0) + 1;
    });
    return Object.keys(counts)
      .map((idStr) => {
        const id = Number(idStr);
        return {
          id,
          name: subjectName(id),
          count: counts[id] ?? 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [session, subjectName]);

  // Selected subject IDs for filtering (default: empty = all questions appear, but no tickmarks)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  // When exam changes, reset subject filter to none ticked
  useEffect(() => {
    setSelectedSubjectIds([]);
  }, [examSlug]);

  const [revealAll, setRevealAll] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllSubjects = () => {
    setSelectedSubjectIds(examSubjects.map((sub) => sub.id));
  };

  const clearAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  const isAllSubjects =
    examSubjects.length > 0 && selectedSubjectIds.length === examSubjects.length;

  // Filtered questions: if no subject is ticked, show ALL questions of the exam!
  // When user ticks specific subjects, filter to only those subjects.
  const filteredQuestions = useMemo(() => {
    if (selectedSubjectIds.length === 0) return session;
    const set = new Set(selectedSubjectIds);
    return session.filter((q) => set.has(q.subject_id));
  }, [session, selectedSubjectIds]);

  const answeredCount = useMemo(() => {
    if (!doneMap) return 0;
    const ids = new Set(session.map((q) => q.id));
    let n = 0;
    for (const key of Object.keys(doneMap)) {
      if (ids.has(Number(key))) n++;
    }
    return n;
  }, [session, doneMap]);

  const toggleNote = useCallback((qid: number) => {
    setExpandedNotes((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  /* Normalize display data ONCE per filter change — the list then passes
     stable primitives, so memoized cards skip re-render on tap. */
  const displayItems: DisplayItem[] = useMemo(
    () =>
      filteredQuestions.map((q) => ({
        q,
        indexLabel: toBn(q.question_number),
        subjectLabel: subjectName(q.subject_id),
        examBadge: undefined,
      })),
    [filteredQuestions, subjectName],
  );

  /* 1. Exam Summary Card */
  const summaryCard = (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-sm">
      <View className="border-b border-black/10 bg-black/[0.02] p-4">
        <View className="mb-1.5 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-[#EA0000]" />
          <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            বিসিএস প্রশ্নপত্র
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 20, lineHeight: 28 }}>
          {`${examLabel(examSlug)} বিসিএস`}
        </Bn>
      </View>

      <View className="p-4 gap-3">
        <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            মোট প্রশ্ন
          </Text>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            {`${toBn(session.length)}টি`}
          </Bn>
        </View>

        <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            উত্তর দিয়েছেন
          </Text>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            {`${toBn(answeredCount)}/${toBn(session.length)}`}
          </Bn>
        </View>

        {answeredCount > 0 ? (
          <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
            <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              সঠিক / ভুল
            </Text>
            <View className="flex-row items-center gap-2">
              <Bn className="text-emerald-700 font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                {`${toBn(right)} সঠিক`}
              </Bn>
              <Text className="text-black/30">·</Text>
              <Bn className="text-rose-600 font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                {`${toBn(wrong)} ভুল`}
              </Bn>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onFinish}
          className="mt-1 min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-lg bg-ink px-4 transition-opacity active:opacity-90">
          <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            অনুশীলন সম্পন্ন করুন
          </Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={onBack}
          className="min-h-[40px] w-full items-center justify-center rounded-lg border border-black/10 bg-paper px-4 transition-colors active:bg-black/5">
          <Text className="text-black/75" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
            অন্য পরীক্ষা বেছে নিন
          </Text>
        </Pressable>
      </View>
    </View>
  );

  /* 2. Subject Filter Card (Tick Format) */
  const filterCard = (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-sm">
      <View className="flex-row items-center justify-between border-b border-black/10 bg-black/[0.02] px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Filter size={15} color="#0A0A0A" />
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>বিষয়ভিত্তিক ফিল্টার</Bn>
        </View>
        {selectedSubjectIds.length > 0 ? (
          <Pressable onPress={clearAllSubjects}>
            <Text className="text-black/70 underline text-xs" style={{ fontFamily: FONT.uiSemi }}>
              ফিল্টার মুছুন
            </Text>
          </Pressable>
        ) : (
          <Text className="text-black/40 text-xs" style={{ fontFamily: FONT.ui }}>
            সব প্রশ্ন প্রদর্শিত
          </Text>
        )}
      </View>

      <View className="divide-y divide-black/5">
        {examSubjects.map((sub) => {
          const active = selectedSubjectIds.includes(sub.id);
          return (
            <Pressable
              key={sub.id}
              onPress={() => toggleSubject(sub.id)}
              className={`flex-row items-center justify-between px-3.5 py-2.5 transition-colors ${
                active ? 'bg-black/[0.03]' : 'bg-surface'
              }`}>
              <View className="flex-1 flex-row items-center gap-2.5 pr-2">
                <View
                  className={`h-4 w-4 items-center justify-center rounded border ${
                    active ? 'border-black bg-ink' : 'border-black/30 bg-surface'
                  }`}>
                  {active ? <Check size={11} color="#FFFFFF" strokeWidth={3.5} /> : null}
                </View>
                <Bn
                  className={active ? 'text-black font-semibold' : 'text-black/75'}
                  style={{ fontFamily: active ? FONT.uiBold : FONT.uiMed, fontSize: 13 }}>
                  {sub.name}
                </Bn>
              </View>
              <Bn className="text-black/45" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                {`${toBn(sub.count)}টি`}
              </Bn>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  /* 3. Controls: Reveal Answers */
  const controlsCard = (
    <View className="rounded-xl border border-black/10 bg-surface p-4 shadow-sm gap-2.5">
      <Text style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>অধ্যয়ন সহায়ক</Text>
      <Pressable
        onPress={() => setRevealAll(!revealAll)}
        className={`min-h-[42px] flex-row items-center justify-center gap-2 rounded-lg border px-3 transition-colors ${
          revealAll ? 'border-black bg-ink text-white' : 'border-black/15 bg-paper'
        }`}>
        {revealAll ? <EyeOff size={15} color="#FFFFFF" /> : <Eye size={15} color="#0A0A0A" />}
        <Text
          className={revealAll ? 'text-white' : 'text-black/80'}
          style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
          {revealAll ? 'সব উত্তর লুকান' : 'সব উত্তর ও ব্যাখ্যা দেখুন'}
        </Text>
      </Pressable>
    </View>
  );

  /* Desktop sidebar content */
  const sidebarContent = (
    <View className="gap-3.5">
      {summaryCard}
      {filterCard}
      {controlsCard}
    </View>
  );

  const { width, height: winH } = useWindowDimensions();
  const isWide = width >= 860;
  const [mobilePanel, setMobilePanel] = useState<'summary' | 'filter' | null>(null);
  /* FlashList needs a definite pixel height to virtualize + scroll (a pure
     flex chain collapses on web). Measure the real viewport + chrome. */
  const [viewportH, setViewportH] = useState(Math.max(0, winH - 180));
  const [chromeH, setChromeH] = useState(48);
  const [toggleH, setToggleH] = useState(56);
  const listH = Math.max(320, viewportH - chromeH - 8);
  const narrowListH = Math.max(
    280,
    viewportH - chromeH - toggleH - 12 - (mobilePanel ? 332 : 0) - 8,
  );

  const listHeader = (
    <View>
      <View className="mb-3 h-1 w-10 rounded-full bg-[#EA0000]" />
      <View className="mb-6 flex-row flex-wrap items-baseline justify-between gap-2 border-b border-black/10 pb-4">
        <View>
          <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 30, lineHeight: 40, marginBottom: 4 }}>
            {`${examLabel(examSlug)} বিসিএস প্রিলিমিনারি`}
          </Bn>
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
            {`পূর্ণ প্রশ্নপত্র • মোট ${toBn(session.length)}টি প্রশ্ন`}
            {selectedSubjectIds.length > 0
              ? ` (ফিল্টারে ${toBn(filteredQuestions.length)}টি দেখানো হচ্ছে)`
              : ''}
          </Text>
        </View>

        <Pressable
          onPress={() => setRevealAll(!revealAll)}
          className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
            revealAll ? 'border-black bg-ink' : 'border-black/15 bg-surface'
          }`}>
          {revealAll ? <EyeOff size={14} color="#FFFFFF" /> : <Eye size={14} color="#0A0A0A" />}
          <Text
            className={revealAll ? 'text-white' : 'text-black/80'}
            style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            {revealAll ? 'উত্তর লুকান' : 'সব উত্তর দেখুন'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const listEmpty = (
    <View className="rounded-xl border border-dashed border-black/20 bg-surface p-10 items-center justify-center">
      <Text className="text-center text-black/60" style={{ fontFamily: FONT.ui, fontSize: 15, marginBottom: 12 }}>
        কোনো বিষয় নির্বাচিত নেই। প্রশ্ন দেখতে বাম পাশের ফিল্টার থেকে বিষয় টিক দিন।
      </Text>
      <Btn title="সব বিষয় নির্বাচন করুন" onPress={selectAllSubjects} />
    </View>
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}>
      <View onLayout={(e) => setChromeH(e.nativeEvent.layout.height)}>
        <Breadcrumb
          trail={[
            { label: 'হোম', href: '/' },
            { label: 'অনুশীলন', onPress: () => { backToHub(); router.push('/practice' as any); } },
            { label: 'বিসিএস পরীক্ষা', onPress: onBack },
            { label: `${examLabel(examSlug)} বিসিএস` },
          ]}
        />
      </View>

      {isWide ? (
        <SidebarLayout
          sidebar={<ScrollView style={{ height: listH }} showsVerticalScrollIndicator={true}>{sidebarContent}</ScrollView>}
          sidebarWidth={290}>
          <View style={{ height: listH }}>
            <QuestionsFlashList
              items={displayItems}
              revealAll={revealAll}
              expandedNotes={expandedNotes}
              onToggleNote={toggleNote}
              header={listHeader}
              empty={listEmpty}
            />
          </View>
        </SidebarLayout>
      ) : (
        <View>
          {/* Mobile Split Action Buttons: Left = সারসংক্ষেপ, Right = ফিল্টার */}
          <View onLayout={(e) => setToggleH(e.nativeEvent.layout.height)} className="mb-3">
            <View className="flex-row gap-2.5">
              {/* Left: সারসংক্ষেপ Button */}
              <Pressable
                onPress={() => setMobilePanel((v) => (v === 'summary' ? null : 'summary'))}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
                  mobilePanel === 'summary'
                    ? 'border-black bg-ink text-white shadow-xs'
                    : 'border-black/10 bg-surface active:bg-black/[0.03]'
                }`}>
                <View className="flex-row items-center gap-2">
                  <FileText size={15} color={mobilePanel === 'summary' ? '#FFFFFF' : '#0A0A0A'} />
                  <Bn
                    className={mobilePanel === 'summary' ? 'text-white font-bold' : 'text-black/90 font-semibold'}
                    style={{ fontFamily: mobilePanel === 'summary' ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
                    সারসংক্ষেপ
                  </Bn>
                </View>
                <Text
                  className={mobilePanel === 'summary' ? 'text-white/80' : 'text-black/50'}
                  style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                  {mobilePanel === 'summary' ? 'লুকান ↑' : 'দেখুন ↓'}
                </Text>
              </Pressable>

              {/* Right: ফিল্টার Button */}
              <Pressable
                onPress={() => setMobilePanel((v) => (v === 'filter' ? null : 'filter'))}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
                  mobilePanel === 'filter'
                    ? 'border-black bg-ink text-white shadow-xs'
                    : 'border-black/10 bg-surface active:bg-black/[0.03]'
                }`}>
                <View className="flex-row items-center gap-2">
                  <Filter size={15} color={mobilePanel === 'filter' ? '#FFFFFF' : '#0A0A0A'} />
                  <Bn
                    className={mobilePanel === 'filter' ? 'text-white font-bold' : 'text-black/90 font-semibold'}
                    style={{ fontFamily: mobilePanel === 'filter' ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
                    ফিল্টার
                  </Bn>
                  {selectedSubjectIds.length > 0 ? (
                    <View
                      className={`rounded-full px-1.5 py-0.5 ${
                        mobilePanel === 'filter' ? 'bg-white/20' : 'bg-[#EA0000]/10'
                      }`}>
                      <Bn
                        className={mobilePanel === 'filter' ? 'text-white' : 'text-[#EA0000]'}
                        style={{ fontFamily: FONT.uiBold, fontSize: 11 }}>
                        {toBn(selectedSubjectIds.length)}
                      </Bn>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={mobilePanel === 'filter' ? 'text-white/80' : 'text-black/50'}
                  style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                  {mobilePanel === 'filter' ? 'লুকান ↑' : 'দেখুন ↓'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Mobile Collapsible Panel */}
          {mobilePanel === 'summary' ? (
            <ScrollView
              style={{ maxHeight: 320 }}
              className="mb-3"
              showsVerticalScrollIndicator={true}>
              <View className="gap-3">
                {summaryCard}
                {controlsCard}
              </View>
            </ScrollView>
          ) : null}

          {mobilePanel === 'filter' ? (
            <ScrollView
              style={{ maxHeight: 320 }}
              className="mb-3"
              showsVerticalScrollIndicator={true}>
              {filterCard}
            </ScrollView>
          ) : null}

          <View style={{ height: narrowListH }}>
            <QuestionsFlashList
              items={displayItems}
              revealAll={revealAll}
              expandedNotes={expandedNotes}
              onToggleNote={toggleNote}
              header={listHeader}
              empty={listEmpty}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= Subject All Questions View (Selected Subjects with 10th–50th BCS Tick Filter) ================= */
function SubjectAllQuestionsView({
  session,
  exams,
  subjectIds,
  subjectName,
  onFinish,
  onBack,
}: {
  session: QuestionRow[];
  exams: { slug: string; total_questions?: number }[];
  subjectIds: number[];
  subjectName: (id: number) => string;
  onFinish: () => void;
  onBack: () => void;
}) {
  const backToHub = usePracticeStore((st) => st.backToHub);
  const doneMap = usePracticeStore((st) => st.done);
  const right = usePracticeStore((st) => st.right);
  const wrong = usePracticeStore((st) => st.wrong);

  // Selected exam slugs for filtering (default: empty = all questions appear, but no tickmarks)
  const [selectedExamSlugs, setSelectedExamSlugs] = useState<string[]>([]);
  const [revealAll, setRevealAll] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  // Question counts per exam slug in this session
  const examQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    session.forEach((q) => {
      counts[q.exam_slug] = (counts[q.exam_slug] ?? 0) + 1;
    });
    return counts;
  }, [session]);

  // Sorted exams 50th down to 10th
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => examNum(b.slug) - examNum(a.slug));
  }, [exams]);

  const toggleExam = (slug: string) => {
    setSelectedExamSlugs((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug],
    );
  };

  const selectAllExams = () => {
    setSelectedExamSlugs(sortedExams.map((e) => e.slug));
  };

  const clearAllExams = () => {
    setSelectedExamSlugs([]);
  };

  // Filtered questions: if no exam is ticked, show ALL questions of the selected subjects!
  // When user ticks specific exams, filter to only those exams.
  const filteredQuestions = useMemo(() => {
    if (selectedExamSlugs.length === 0) return session;
    const set = new Set(selectedExamSlugs);
    return session.filter((q) => set.has(q.exam_slug));
  }, [session, selectedExamSlugs]);

  const answeredCount = useMemo(() => {
    if (!doneMap) return 0;
    const ids = new Set(session.map((q) => q.id));
    let n = 0;
    for (const key of Object.keys(doneMap)) {
      if (ids.has(Number(key))) n++;
    }
    return n;
  }, [session, doneMap]);

  const toggleNote = useCallback((qid: number) => {
    setExpandedNotes((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  /* Normalize display data ONCE per filter change — the list then passes
     stable primitives, so memoized cards skip re-render on tap. */
  const displayItems: DisplayItem[] = useMemo(() => {
    const base = 0;
    return filteredQuestions.map((q, i) => ({
      q,
      indexLabel: toBn(base + i + 1),
      subjectLabel: subjectName(q.subject_id),
      examBadge: `${examLabel(q.exam_slug)} বিসিএস (প্রশ্ন #${toBn(q.question_number)})`,
    }));
  }, [filteredQuestions, subjectName]);

  // Human-readable list of selected subjects
  const subjectTitles = useMemo(() => {
    return subjectIds.map((id) => subjectName(id));
  }, [subjectIds, subjectName]);

  /* 1. Summary Card */
  const summaryCard = (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-sm">
      <View className="border-b border-black/10 bg-black/[0.02] p-4">
        <View className="mb-1.5 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-[#EA0000]" />
          <Text className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            বিষয়ভিত্তিক অনুশীলন
          </Text>
        </View>
        <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 18, lineHeight: 26 }}>
          {subjectTitles.length === 1
            ? subjectTitles[0]
            : subjectTitles.length === 10
              ? 'সব বিষয় (১০টি বিষয়)'
              : `নির্বাচিত ${toBn(subjectTitles.length)}টি বিষয়`}
        </Bn>
      </View>

      <View className="p-4 gap-3">
        <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            মোট প্রশ্ন
          </Text>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            {`${toBn(session.length)}টি`}
          </Bn>
        </View>

        <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
            উত্তর দিয়েছেন
          </Text>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            {`${toBn(answeredCount)}/${toBn(session.length)}`}
          </Bn>
        </View>

        {answeredCount > 0 ? (
          <View className="flex-row items-center justify-between border-b border-black/5 pb-2.5">
            <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              সঠিক / ভুল
            </Text>
            <View className="flex-row items-center gap-2">
              <Bn className="text-emerald-700 font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                {`${toBn(right)} সঠিক`}
              </Bn>
              <Text className="text-black/30">·</Text>
              <Bn className="text-rose-600 font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                {`${toBn(wrong)} ভুল`}
              </Bn>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onFinish}
          className="mt-1 min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-lg bg-ink px-4 transition-opacity active:opacity-90">
          <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
            অনুশীলন সম্পন্ন করুন
          </Text>
          <ArrowRight size={15} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={onBack}
          className="min-h-[40px] w-full items-center justify-center rounded-lg border border-black/10 bg-paper px-4 transition-colors active:bg-black/5">
          <Text className="text-black/75" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
            বিষয় পরিবর্তন করুন
          </Text>
        </Pressable>
      </View>
    </View>
  );

  /* 2. Controls: Reveal Answers */
  const controlsCard = (
    <View className="rounded-xl border border-black/10 bg-surface p-4 shadow-sm gap-2.5">
      <Text style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>অধ্যয়ন সহায়ক</Text>
      <Pressable
        onPress={() => setRevealAll(!revealAll)}
        className={`min-h-[42px] flex-row items-center justify-center gap-2 rounded-lg border px-3 transition-colors ${
          revealAll ? 'border-black bg-ink text-white' : 'border-black/15 bg-paper'
        }`}>
        {revealAll ? <EyeOff size={15} color="#FFFFFF" /> : <Eye size={15} color="#0A0A0A" />}
        <Text
          className={revealAll ? 'text-white' : 'text-black/80'}
          style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
          {revealAll ? 'সব উত্তর লুকান' : 'সব উত্তর ও ব্যাখ্যা দেখুন'}
        </Text>
      </Pressable>
    </View>
  );

  /* 3. BCS Exam Filter Card (Unified 10th–50th BCS - No Eras) */
  const filterCard = (
    <View className="overflow-hidden rounded-xl border border-black/10 bg-surface shadow-sm">
      {/* Header */}
      <View className="border-b border-black/10 bg-black/[0.02] px-4 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Filter size={15} color="#0A0A0A" />
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>বিসিএস ফিল্টার</Bn>
          </View>
          <Bn className="text-black/50" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            ১০ম–৫০তম
          </Bn>
        </View>
        <View className="mt-2 flex-row items-center justify-between pt-1 border-t border-black/5">
          <Bn className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 12 }}>
            {selectedExamSlugs.length > 0
              ? `${toBn(selectedExamSlugs.length)}টি বিসিএস নির্বাচিত`
              : 'সব প্রশ্ন প্রদর্শিত (কোনো ফিল্টার নেই)'}
          </Bn>
          {selectedExamSlugs.length > 0 ? (
            <Pressable onPress={clearAllExams} className="rounded px-1.5 py-0.5 hover:bg-black/5">
              <Text className="text-rose-600 underline" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                ফিল্টার মুছুন
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={selectAllExams} className="rounded px-1.5 py-0.5 hover:bg-black/5">
              <Text className="text-black/60 underline" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                সব নির্বাচন
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 10th-50th Exam Cards 2-Column Responsive Grid (Fixed 54dp Height) */}
      <View className="p-3">
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}>
          {sortedExams.map((e) => {
            const active = selectedExamSlugs.includes(e.slug);
            const qCount = examQuestionCounts[e.slug] ?? 0;
            const n = examNum(e.slug);

            return (
              <Pressable
                key={e.slug}
                onPress={() => toggleExam(e.slug)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={{
                  width: 'calc(50% - 4px)' as any,
                  height: 54,
                  minHeight: 54,
                  maxHeight: 54,
                }}
                className={`flex-row items-center rounded-xl border px-2.5 overflow-hidden transition-all ${
                  active
                    ? 'border-black bg-ink text-white shadow-xs'
                    : 'border-black/10 bg-surface hover:border-black/30 hover:bg-black/[0.02]'
                }`}>
                <View
                  className={`mr-2 h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active ? 'border-white bg-white' : 'border-black/25 bg-surface'
                  }`}>
                  {active ? <Check size={11} color="#0A0A0A" strokeWidth={3.5} /> : null}
                </View>
                <View className="flex-1 justify-center min-w-0">
                  <Bn
                    numberOfLines={1}
                    className={active ? 'text-white font-bold' : 'text-black/90 font-semibold'}
                    style={{
                      fontFamily: active ? FONT.uiBold : FONT.uiSemi,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {`${toBn(n)}তম বিসিএস`}
                  </Bn>
                  <Bn
                    numberOfLines={1}
                    className={active ? 'text-white/70' : 'text-black/45'}
                    style={{
                      fontFamily: FONT.ui,
                      fontSize: 11,
                      lineHeight: 15,
                    }}>
                    {qCount > 0 ? `${toBn(qCount)}টি প্রশ্ন` : '০টি প্রশ্ন'}
                  </Bn>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  /* Desktop sidebar content */
  const sidebarContent = (
    <View className="gap-3.5">
      {summaryCard}
      {filterCard}
      {controlsCard}
    </View>
  );

  const { width, height: winH } = useWindowDimensions();
  const isWide = width >= 860;
  const [mobilePanel, setMobilePanel] = useState<'summary' | 'filter' | null>(null);
  /* FlashList needs a definite pixel height to virtualize + scroll (a pure
     flex chain collapses on web). Measure the real viewport + chrome. */
  const [viewportH, setViewportH] = useState(Math.max(0, winH - 180));
  const [chromeH, setChromeH] = useState(48);
  const [toggleH, setToggleH] = useState(56);
  const listH = Math.max(320, viewportH - chromeH - 8);
  const narrowListH = Math.max(
    280,
    viewportH - chromeH - toggleH - 12 - (mobilePanel ? 332 : 0) - 8,
  );

  const listHeader = (
    <View>
      <View className="mb-3 h-1 w-10 rounded-full bg-[#EA0000]" />
      <View className="mb-6 flex-row flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
        <View className="flex-1 min-w-[260px]">
          <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 28, lineHeight: 38, marginBottom: 4 }}>
            {subjectTitles.length === 1
              ? `${subjectTitles[0]} প্রশ্নভান্ডার`
              : subjectTitles.length === 10
                ? '১০টি বিষয়ের সমন্বিত প্রশ্নভান্ডার'
                : `নির্বাচিত ${toBn(subjectTitles.length)}টি বিষয়ের প্রশ্নভান্ডার`}
          </Bn>
          {subjectTitles.length > 1 && (
            <View className="mt-1.5 mb-2.5 flex-row flex-wrap gap-1.5">
              {subjectTitles.map((title) => (
                <View
                  key={title}
                  className="rounded-md border border-black/10 bg-black/[0.03] px-2.5 py-1">
                  <Text
                    className="text-black/75"
                    style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                    {title}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
            {`১০ম–৫০তম বিসিএস • মোট ${toBn(session.length)}টি প্রশ্ন`}
            {selectedExamSlugs.length > 0
              ? ` (${toBn(selectedExamSlugs.length)}টি বিসিএস ফিল্টারে ${toBn(filteredQuestions.length)}টি প্রদর্শিত)`
              : ''}
          </Text>
        </View>

        <Pressable
          onPress={() => setRevealAll(!revealAll)}
          className={`shrink-0 mt-1 flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
            revealAll ? 'border-black bg-ink' : 'border-black/15 bg-surface'
          }`}>
          {revealAll ? <EyeOff size={14} color="#FFFFFF" /> : <Eye size={14} color="#0A0A0A" />}
          <Text
            className={revealAll ? 'text-white' : 'text-black/80'}
            style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
            {revealAll ? 'উত্তর লুকান' : 'সব উত্তর দেখুন'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const listEmpty = (
    <View className="rounded-xl border border-dashed border-black/20 bg-surface p-10 items-center justify-center">
      <Text className="text-center text-black/60" style={{ fontFamily: FONT.ui, fontSize: 15, marginBottom: 12 }}>
        নির্বাচিত বিসিএস ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি।
      </Text>
      <Btn title="সব ফিল্টার মুছুন" onPress={clearAllExams} />
    </View>
  );

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}>
      <View onLayout={(e) => setChromeH(e.nativeEvent.layout.height)}>
        <Breadcrumb
          trail={[
            { label: 'হোম', href: '/' },
            { label: 'অনুশীলন', onPress: () => { backToHub(); router.push('/practice' as any); } },
            { label: 'বিষয়ভিত্তিক অনুশীলন', onPress: onBack },
            {
              label:
                subjectTitles.length === 1
                  ? subjectTitles[0]
                  : `${toBn(subjectTitles.length)}টি বিষয়`,
            },
          ]}
        />
      </View>

      {isWide ? (
        <SidebarLayout
          sidebar={<ScrollView style={{ height: listH }} showsVerticalScrollIndicator={true}>{sidebarContent}</ScrollView>}
          sidebarWidth={310}>
          <View style={{ height: listH }}>
            <QuestionsFlashList
              items={displayItems}
              revealAll={revealAll}
              expandedNotes={expandedNotes}
              onToggleNote={toggleNote}
              header={listHeader}
              empty={listEmpty}
            />
          </View>
        </SidebarLayout>
      ) : (
        <View>
          {/* Mobile Split Action Buttons: Left = সারসংক্ষেপ, Right = ফিল্টার */}
          <View onLayout={(e) => setToggleH(e.nativeEvent.layout.height)} className="mb-3">
            <View className="flex-row gap-2.5">
              {/* Left: সারসংক্ষেপ Button */}
              <Pressable
                onPress={() => setMobilePanel((v) => (v === 'summary' ? null : 'summary'))}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
                  mobilePanel === 'summary'
                    ? 'border-black bg-ink text-white shadow-xs'
                    : 'border-black/10 bg-surface active:bg-black/[0.03]'
                }`}>
                <View className="flex-row items-center gap-2">
                  <FileText size={15} color={mobilePanel === 'summary' ? '#FFFFFF' : '#0A0A0A'} />
                  <Bn
                    className={mobilePanel === 'summary' ? 'text-white font-bold' : 'text-black/90 font-semibold'}
                    style={{ fontFamily: mobilePanel === 'summary' ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
                    সারসংক্ষেপ
                  </Bn>
                </View>
                <Text
                  className={mobilePanel === 'summary' ? 'text-white/80' : 'text-black/50'}
                  style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                  {mobilePanel === 'summary' ? 'লুকান ↑' : 'দেখুন ↓'}
                </Text>
              </Pressable>

              {/* Right: ফিল্টার Button */}
              <Pressable
                onPress={() => setMobilePanel((v) => (v === 'filter' ? null : 'filter'))}
                accessibilityRole="button"
                className={`flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-3 transition-all ${
                  mobilePanel === 'filter'
                    ? 'border-black bg-ink text-white shadow-xs'
                    : 'border-black/10 bg-surface active:bg-black/[0.03]'
                }`}>
                <View className="flex-row items-center gap-2">
                  <Filter size={15} color={mobilePanel === 'filter' ? '#FFFFFF' : '#0A0A0A'} />
                  <Bn
                    className={mobilePanel === 'filter' ? 'text-white font-bold' : 'text-black/90 font-semibold'}
                    style={{ fontFamily: mobilePanel === 'filter' ? FONT.uiBold : FONT.uiSemi, fontSize: 13.5 }}>
                    ফিল্টার
                  </Bn>
                  {selectedExamSlugs.length > 0 ? (
                    <View
                      className={`rounded-full px-1.5 py-0.5 ${
                        mobilePanel === 'filter' ? 'bg-white/20' : 'bg-[#EA0000]/10'
                      }`}>
                      <Bn
                        className={mobilePanel === 'filter' ? 'text-white' : 'text-[#EA0000]'}
                        style={{ fontFamily: FONT.uiBold, fontSize: 11 }}>
                        {toBn(selectedExamSlugs.length)}
                      </Bn>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={mobilePanel === 'filter' ? 'text-white/80' : 'text-black/50'}
                  style={{ fontFamily: FONT.ui, fontSize: 12 }}>
                  {mobilePanel === 'filter' ? 'লুকান ↑' : 'দেখুন ↓'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Mobile Collapsible Panel */}
          {mobilePanel === 'summary' ? (
            <ScrollView
              style={{ maxHeight: 340 }}
              className="mb-3"
              showsVerticalScrollIndicator={true}>
              <View className="gap-3.5">
                {summaryCard}
                {controlsCard}
              </View>
            </ScrollView>
          ) : mobilePanel === 'filter' ? (
            <ScrollView
              style={{ maxHeight: 340 }}
              className="mb-3"
              showsVerticalScrollIndicator={true}>
              {filterCard}
            </ScrollView>
          ) : null}

          <View style={{ height: narrowListH }}>
            <QuestionsFlashList
              items={displayItems}
              revealAll={revealAll}
              expandedNotes={expandedNotes}
              onToggleNote={toggleNote}
              header={listHeader}
              empty={listEmpty}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= Runner ================= */
function RunnerView({
  session,
  subjectName,
  scope,
  onFinish,
}: {
  session: QuestionRow[];
  subjectName: (id: number) => string;
  scope: string;
  onFinish: () => void;
}) {
  const s = usePracticeStore();
  const lib = useLibrary();
  const q = session[s.idx];
  if (!q) return null;
  const done = s.done[q.id];
  const locked = !!done;
  const bookmarked = lib.bookmarks.includes(q.id);

  return (
    <View className="gap-4">
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'অনুশীলন', onPress: () => { s.backToHub(); router.push('/practice' as any); } }, { label: 'প্রশ্নোত্তর' }]} />
      <Cols min={300} weights={[2, 1]}>
      <View className="border border-black/10 bg-surface p-5">
        <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Tag>{`${examLabel(q.exam_slug)} বিসিএস`}</Tag>
            <Tag>{subjectName(q.subject_id)}</Tag>
            {!q.correct_answer ? <Tag warn>উৎসে উত্তর নেই</Tag> : null}
          </View>
          <View className="flex-row items-center gap-2">
            <BookmarkBtn active={bookmarked} onPress={() => lib.toggleBookmark(q.id)} />
            <Text className="text-black/50" style={{ fontFamily: FONT.digits, fontSize: 12 }}>
              {toBn(s.idx + 1)}/{toBn(session.length)}
            </Text>
          </View>
        </View>
        <View className="mb-4 h-1 bg-black/10">
          <View className="h-1 bg-accent" style={{ width: `${((s.idx + 1) / session.length) * 100}%` }} />
        </View>
        <Bn style={{ fontFamily: FONT.uiBold, fontSize: 20, lineHeight: 32, marginBottom: q.question ? 12 : 0 }}>
          {q.question || '(ছবিতে প্রশ্ন দেখুন)'}
        </Bn>
        {(q.question_image_urls ?? []).map((u) => (
          <View key={u} className="mb-4 items-center border border-black/10 bg-white p-3">
            <Image source={{ uri: u }} style={{ width: '100%', height: 240 }} contentFit="contain" />
          </View>
        ))}
        <View className="gap-2.5" accessibilityRole="radiogroup">
          {OPT_KEYS.map((k) => {
            const txt = optText(q, k);
            let state: OptState = 'idle';
            if (locked) {
              if ((done.pick === k && done.ok) || (done.reveal && q.correct_answer === k)) state = 'correct';
              else if (done.pick === k && !done.ok) state = 'wrong';
              else state = 'disabled';
            } else if (!q.correct_answer || !txt) state = 'disabled';
            return (
              <OptBtn
                key={k}
                k={k}
                text={txt}
                state={state}
                onPress={() => s.answer(q.id, k, k === q.correct_answer)}
              />
            );
          })}
        </View>
        {done ? (
          <Feedback
            kind={done.reveal ? 'info' : done.ok ? 'ok' : 'bad'}
            title={
              done.reveal
                ? `সঠিক উত্তর: ${q.correct_answer}`
                : done.ok
                  ? 'সঠিক উত্তর দিয়েছেন।'
                  : 'উত্তরটি সঠিক হয়নি'
            }
            note={
              (done.reveal || !done.ok) && q.correct_answer
                ? `সঠিক উত্তর: ${q.correct_answer}${q.solve_note ? ` — ${q.solve_note}` : ''}`
                : q.solve_note || undefined
            }
            images={q.solve_note_image_urls}
          />
        ) : null}
        <View className="mt-5 flex-row flex-wrap justify-between gap-2 border-t border-black/10 pt-5">
          <View className="flex-row gap-2">
            <Btn title="← আগেরটি" disabled={s.idx === 0} onPress={s.prev} />
            <Btn title="পরেরটি →" variant="dark" disabled={s.idx === session.length - 1} onPress={() => s.next(session.length)} />
          </View>
          <View className="flex-row gap-2">
            <Btn title="উত্তর দেখুন" disabled={locked || !q.correct_answer} onPress={() => s.reveal(q.id)} />
            <Btn title="শেষ করুন ✓" variant="accent" onPress={onFinish} />
          </View>
        </View>
      </View>
      <View className="gap-4">
        <ScorePanel right={s.right} wrong={s.wrong} />
        <Card title="বাছাই">
          <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 14, marginBottom: 12 }}>
            {scope}
          </Bn>
          <Btn title="বছর / বিষয় বদলান" onPress={() => s.backToPicker()} />
        </Card>
      </View>
      </Cols>
    </View>
  );
}

/* ================= Result ================= */
function PracticeResult({
  session,
  subjectName,
  onRetry,
  onPicker,
  onHub,
}: {
  session: QuestionRow[];
  subjectName: (id: number) => string;
  onRetry: () => void;
  onPicker: () => void;
  onHub: () => void;
}) {
  const s = usePracticeStore();
  const total = session.length;
  const attempted = Object.keys(s.done).length;
  const acc = attempted ? Math.round((s.right / attempted) * 100) : 0;
  const wrongList = session.filter((q) => {
    const d = s.done[q.id];
    return d && !d.ok && d.pick && q.correct_answer;
  });

  return (
    <View className="gap-4">
      <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'অনুশীলন', onPress: () => { s.backToHub(); router.push('/practice' as any); } }, { label: 'ফলাফল' }]} />
      <View className="items-center border border-black bg-surface p-8">
        <Bn bold style={{ fontFamily: FONT.displayBlack, fontSize: 40 }}>
          {`${toBn(s.right)} / ${toBn(total)}`}
        </Bn>
        <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 14, marginTop: 6 }}>
          {`নির্ভুলতা ${toBn(acc)}% · ${toBn(attempted)}টির উত্তর দিয়েছেন`}
        </Bn>
      </View>
      <View className="flex-row flex-wrap border border-black/10 bg-surface">
        {[
          ['সঠিক', toBn(s.right), true, false],
          ['ভুল', toBn(s.wrong), false, true],
          ['দেখা হয়নি', toBn(total - attempted), false, false],
        ].map(([l, v, good, bad]) => (
          <View key={l as string} className="min-w-[30%] flex-1 items-center p-4">
            <Text className={good ? 'text-ok' : bad ? 'text-accent' : ''} style={{ fontFamily: FONT.digits, fontSize: 24, fontWeight: '700' }}>
              {v}
            </Text>
            <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>{l}</Text>
          </View>
        ))}
      </View>
      {wrongList.length ? (
        <View>
          <Bn style={{ fontFamily: FONT.uiBold, fontSize: 18, marginBottom: 8 }}>{`ভুল হওয়া প্রশ্ন (${toBn(wrongList.length)})`}</Bn>
          {wrongList.map((q) => {
            const d = s.done[q.id];
            return (
              <View key={q.id} className="mb-3 border-b border-black/10 bg-surface pb-4 pt-1">
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 15, lineHeight: 24, marginBottom: 4 }}>
                  <Bn>{q.question || '(ছবির প্রশ্ন)'}</Bn>
                  <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12 }}>· {subjectName(q.subject_id)}</Text>
                </Text>
                <Bn className="text-accent" style={{ fontFamily: FONT.ui, fontSize: 14, marginBottom: 2 }}>
                  {`আপনার উত্তর: ${d.pick} — ${optText(q, d.pick ?? '')}`}
                </Bn>
                <Bn className="text-ok" style={{ fontFamily: FONT.ui, fontSize: 14 }}>
                  {`সঠিক: ${q.correct_answer} — ${optText(q, q.correct_answer ?? '')}`}
                </Bn>
                {!!q.solve_note ? (
                  <Bn className="text-black/70" style={{ fontFamily: FONT.ui, fontSize: 13, marginTop: 4 }}>{q.solve_note}</Bn>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontFamily: FONT.uiBold, fontSize: 16 }}>সবগুলো সঠিক — চমৎকার!</Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        <Btn title="↻ আবার (এলোমেলো)" variant="dark" onPress={onRetry} />
        <Btn title="নতুন বাছাই" onPress={onPicker} />
        <Btn title="হাবে ফিরুন" onPress={onHub} />
      </View>
      <View className="flex-row items-center gap-2">
        <Zap size={16} color="#0A0A0A" />
        <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
          "আবার" চাপলে একই পুল থেকে নতুন ক্রমে প্রশ্ন আসবে।
        </Text>
      </View>
    </View>
  );
}
