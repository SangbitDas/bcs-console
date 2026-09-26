import { useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, Play, Trash2, ArrowRight } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { examLabel, toBn, type QuestionRow } from '../lib/format';
import { useLibrary } from '../lib/library';
import { usePracticeStore } from '../store/practice';
import { useQuestionPool, useSubjects } from '../hooks/queries';
import { Bn, Btn, Tag } from '../components/ui';
import { Breadcrumb } from '../components/patterns';
import { QuestionCard, type DisplayItem } from '../components/practice-screen';

export default function WrongQuestionsScreen() {
  const lib = useLibrary();
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const pool = useQuestionPool({
    key: `wr-screen-${lib.wrongIds.length}`,
    ids: lib.wrongIds,
    enabled: lib.wrongIds.length > 0,
  });

  const subjectMap = useMemo(() => {
    const map = new Map<number, string>();
    (subjects ?? []).forEach((s) => map.set(s.id, s.subject_bn));
    return map;
  }, [subjects]);

  const questions = useMemo(() => {
    return pool.data ?? [];
  }, [pool.data]);

  const filteredQuestions = useMemo(() => {
    if (!selectedSubject) return questions;
    return questions.filter((q) => q.subject_id === selectedSubject);
  }, [questions, selectedSubject]);

  const subjectCounts = useMemo(() => {
    const counts = new Map<number, number>();
    questions.forEach((q) => {
      counts.set(q.subject_id, (counts.get(q.subject_id) ?? 0) + 1);
    });
    return counts;
  }, [questions]);

  const displayItems: DisplayItem[] = useMemo(() => {
    return filteredQuestions.map((q, idx) => ({
      q,
      indexLabel: toBn(idx + 1),
      subjectLabel: subjectMap.get(q.subject_id) ?? `বিষয় ${q.subject_id}`,
      examBadge: `${examLabel(q.exam_slug)} বিসিএস`,
    }));
  }, [filteredQuestions, subjectMap]);

  const toggleNote = useCallback((qid: number) => {
    setExpandedNotes((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  const startInteractivePractice = () => {
    usePracticeStore.getState().backToHub();
    router.push('/practice' as any);
  };

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1000px] px-5 py-8">
        <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'ভুলসমূহ' }]} />

        {/* Header section */}
        <View className="mb-6 border-b border-black/10 pb-6">
          <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
          <View className="flex-row flex-wrap items-center justify-between gap-4">
            <View>
              <Text style={{ fontFamily: FONT.displayBlack, fontSize: 26, lineHeight: 34 }}>
                ভুলসমূহ
              </Text>
              <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14, marginTop: 4 }}>
                অনুশীলন ও পরীক্ষায় ভুল উত্তর দেওয়া প্রশ্নগুলো পুনরায় সমাধান করে দুর্বলতা কাটিয়ে উঠুন।
              </Text>
            </View>

            {lib.wrongIds.length > 0 ? (
              <View className="flex-row flex-wrap items-center gap-2">
                <Pressable
                  onPress={() => lib.clearWrong()}
                  className="flex-row items-center gap-1.5 rounded-lg border border-black/15 bg-surface px-3 py-2 transition-colors active:bg-black/5">
                  <Trash2 size={14} color="rgba(0,0,0,0.6)" />
                  <Text className="text-black/70" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                    সব মুছুন
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRevealAll((v) => !v)}
                  className="rounded-lg border border-black/15 bg-surface px-3 py-2 transition-colors active:bg-black/5">
                  <Text className="text-black/80" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                    {revealAll ? 'উত্তর লুকান' : 'সব উত্তর দেখুন'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={startInteractivePractice}
                  className="flex-row items-center gap-2 rounded-lg bg-ink px-4 py-2 transition-colors active:bg-black/80">
                  <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
                  <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>
                    অনুশীলন শুরু করুন
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {lib.wrongIds.length === 0 ? (
          /* Empty State */
          <View className="my-10 items-center justify-center rounded-2xl border border-dashed border-black/20 bg-surface p-10 text-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 size={32} color="#059669" />
            </View>
            <Text style={{ fontFamily: FONT.uiBold, fontSize: 18, marginBottom: 6 }}>
              কোনো ভুল সংরক্ষিত নেই
            </Text>
            <Text className="max-w-md text-center text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
              অনুশীলন বা মক এক্সাম সম্পন্ন করার সময় যে প্রশ্নগুলোর উত্তর ভুল হবে, তা স্বয়ংক্রিয়ভাবে এখানে জমা থাকবে যাতে পরে চর্চা করতে পারেন।
            </Text>
            <Pressable
              onPress={() => router.push('/practice' as any)}
              className="flex-row items-center gap-2 rounded-xl bg-ink px-5 py-2.5">
              <Text className="text-white" style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
                অনুশীলনে যান
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : pool.isPending ? (
          /* Loading State */
          <View className="py-20 items-center justify-center gap-3">
            <ActivityIndicator size="small" color="#0A0A0A" />
            <Text className="text-black/60" style={{ fontFamily: FONT.uiMed, fontSize: 14 }}>
              ভুলসমূহ আনা হচ্ছে…
            </Text>
          </View>
        ) : (
          /* Question Content */
          <View>
            {/* Subject Filter Pills */}
            <View className="mb-6 flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={() => setSelectedSubject(null)}
                className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                  selectedSubject === null
                    ? 'border-black bg-ink'
                    : 'border-black/15 bg-surface active:bg-black/5'
                }`}>
                <Text
                  style={{
                    fontFamily: selectedSubject === null ? FONT.uiBold : FONT.uiMed,
                    fontSize: 12,
                    color: selectedSubject === null ? '#FFFFFF' : 'rgba(0,0,0,0.8)',
                  }}>
                  সব ({toBn(questions.length)})
                </Text>
              </Pressable>

              {Array.from(subjectCounts.entries()).map(([subId, cnt]) => {
                const isSelected = selectedSubject === subId;
                const subName = subjectMap.get(subId) ?? `বিষয় ${subId}`;
                return (
                  <Pressable
                    key={subId}
                    onPress={() => setSelectedSubject(isSelected ? null : subId)}
                    className={`rounded-full border px-3 py-1.5 transition-colors ${
                      isSelected
                        ? 'border-black bg-ink'
                        : 'border-black/15 bg-surface active:bg-black/5'
                    }`}>
                    <Text
                      style={{
                        fontFamily: isSelected ? FONT.uiBold : FONT.uiMed,
                        fontSize: 12,
                        color: isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.8)',
                      }}>
                      {subName} ({toBn(cnt)})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Questions List */}
            <View className="gap-4">
              {displayItems.map((item) => (
                <QuestionCard
                  key={item.q.id}
                  q={item.q}
                  indexLabel={item.indexLabel}
                  subjectLabel={item.subjectLabel}
                  examBadge={item.examBadge}
                  revealAll={revealAll}
                  expanded={!!expandedNotes[item.q.id]}
                  onToggleNote={toggleNote}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
