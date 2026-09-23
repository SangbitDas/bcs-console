import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from './supabase';
import { useAuthStore } from './auth';

export interface RerunConfig {
  mode: 'exam' | 'subject' | 'custom' | 'bookmarks' | 'wrong';
  exam: string;
  subjects: number[];
  fromN: number;
  toN: number;
  count: number | null;
  order: 'seq' | 'random';
}

export interface MockRerunConfig {
  count: number;
  minutes: number;
  source?: 'full' | 'exam' | 'subject' | 'custom';
  exam?: string;
  exams?: string[];
  fromN?: number;
  toN?: number;
  subjects?: number[];
  order?: 'seq' | 'random';
}

export interface RecentSession {
  id: string;
  kind: 'practice' | 'mock' | 'custom';
  label: string;
  total: number;
  right: number;
  wrong?: number;
  score?: number;
  at: number;
  rerun?: RerunConfig;
  mockRerun?: MockRerunConfig;
  done?: Record<number, { pick: string | null; ok: boolean; reveal?: boolean }>;
  idx?: number;
  completed?: boolean;
}

export interface AttemptAnswerInput {
  question_id: number;
  subject_id: number;
  user_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
  time_spent_seconds?: number;
}

export interface ExamAttemptInput {
  exam_type: 'mock' | 'custom' | 'exam' | 'subject';
  exam_slug?: string;
  title: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  negative_marking?: number;
  marks_obtained: number;
  total_marks?: number;
  time_spent_seconds: number;
  answers?: AttemptAnswerInput[];
}

interface LibraryState {
  recents: RecentSession[];
  bookmarks: number[];
  wrongIds: number[];
  pushRecent: (r: Omit<RecentSession, 'id' | 'at'>) => void;
  toggleBookmark: (qid: number) => Promise<void>;
  addWrong: (qids: number[]) => Promise<void>;
  clearWrong: () => Promise<void>;
  syncCloud: () => Promise<void>;
  saveExamAttempt: (attempt: ExamAttemptInput) => Promise<string | null>;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      recents: [],
      bookmarks: [],
      wrongIds: [],

      pushRecent: (r) =>
        set((s) => {
          // Find matching recent session by kind, label, exam, and subjects
          const matchIdx = s.recents.findIndex((item) => {
            if (item.kind !== r.kind) return false;
            if (item.label !== r.label) return false;
            if (item.rerun?.mode !== r.rerun?.mode) return false;
            if (item.rerun?.exam !== r.rerun?.exam) return false;
            const itemSubs = (item.rerun?.subjects || []).slice().sort().join(',');
            const rSubs = (r.rerun?.subjects || []).slice().sort().join(',');
            return itemSubs === rSubs;
          });

          const now = Date.now();
          let nextRecents = [...s.recents];

          if (matchIdx >= 0) {
            const existing = nextRecents[matchIdx];
            const updated: RecentSession = {
              ...existing,
              ...r,
              id: existing.id,
              at: now,
              done: { ...(existing.done || {}), ...(r.done || {}) },
            };
            nextRecents.splice(matchIdx, 1);
            nextRecents.unshift(updated);
          } else {
            nextRecents.unshift({
              ...r,
              id: `${now}-${Math.floor(Math.random() * 1e6)}`,
              at: now,
            });
          }

          return { recents: nextRecents.slice(0, 10) };
        }),

      toggleBookmark: async (qid) => {
        const isBookmarked = get().bookmarks.includes(qid);
        // 1. Optimistic local update
        set((s) => ({
          bookmarks: isBookmarked
            ? s.bookmarks.filter((x) => x !== qid)
            : [qid, ...s.bookmarks].slice(0, 500),
        }));

        // 2. Cloud sync if authenticated
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          if (isBookmarked) {
            await db
              .from('user_bookmarks')
              .delete()
              .eq('user_id', user.id)
              .eq('question_id', qid);
          } else {
            await db
              .from('user_bookmarks')
              .upsert({ user_id: user.id, question_id: qid }, { onConflict: 'user_id,question_id' });
          }
        } catch (err) {
          console.warn('Error syncing bookmark to cloud:', err);
        }
      },

      addWrong: async (qids) => {
        if (!qids.length) return;
        // 1. Optimistic local update
        set((s) => ({
          wrongIds: [...qids, ...s.wrongIds.filter((x) => !qids.includes(x))].slice(0, 300),
        }));

        // 2. Cloud sync if authenticated
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          const rows = qids.map((qid) => ({
            user_id: user.id,
            question_id: qid,
            last_wrong_at: new Date().toISOString(),
            is_resolved: false,
          }));
          await db.from('user_mistakes').upsert(rows, { onConflict: 'user_id,question_id' });
        } catch (err) {
          console.warn('Error syncing wrong questions to cloud:', err);
        }
      },

      clearWrong: async () => {
        set({ wrongIds: [] });
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          await db.from('user_mistakes').update({ is_resolved: true }).eq('user_id', user.id);
        } catch (err) {
          console.warn('Error clearing mistakes in cloud:', err);
        }
      },

      syncCloud: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          // 1. Sync bookmarks
          const { data: cloudBm } = await db
            .from('user_bookmarks')
            .select('question_id')
            .eq('user_id', user.id);

          const cloudBmIds = (cloudBm ?? []).map((b) => Number(b.question_id));
          const localBmIds = get().bookmarks;
          const mergedBm = Array.from(new Set([...cloudBmIds, ...localBmIds]));

          set({ bookmarks: mergedBm });

          // Upload any local-only bookmarks to cloud
          const toUpload = localBmIds.filter((id) => !cloudBmIds.includes(id));
          if (toUpload.length > 0) {
            await db
              .from('user_bookmarks')
              .upsert(toUpload.map((qid) => ({ user_id: user.id, question_id: qid })), {
                onConflict: 'user_id,question_id',
              });
          }

          // 2. Sync unresolved mistakes
          const { data: cloudMistakes } = await db
            .from('user_mistakes')
            .select('question_id')
            .eq('user_id', user.id)
            .eq('is_resolved', false);

          const cloudMistakeIds = (cloudMistakes ?? []).map((m) => Number(m.question_id));
          const localMistakes = get().wrongIds;
          const mergedMistakes = Array.from(new Set([...cloudMistakeIds, ...localMistakes]));

          set({ wrongIds: mergedMistakes });

          const mistakesToUpload = localMistakes.filter((id) => !cloudMistakeIds.includes(id));
          if (mistakesToUpload.length > 0) {
            await db.from('user_mistakes').upsert(
              mistakesToUpload.map((qid) => ({
                user_id: user.id,
                question_id: qid,
                last_wrong_at: new Date().toISOString(),
                is_resolved: false,
              })),
              { onConflict: 'user_id,question_id' },
            );
          }
        } catch (err) {
          console.warn('Error during cloud sync:', err);
        }
      },

      saveExamAttempt: async (attempt) => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        try {
          // 1. Insert exam attempt row
          const { data: attemptRow, error } = await db
            .from('exam_attempts')
            .insert({
              user_id: user.id,
              exam_type: attempt.exam_type,
              exam_slug: attempt.exam_slug ?? null,
              title: attempt.title,
              total_questions: attempt.total_questions,
              correct_count: attempt.correct_count,
              wrong_count: attempt.wrong_count,
              unanswered_count: attempt.unanswered_count,
              negative_marking: attempt.negative_marking ?? 0.50,
              marks_obtained: attempt.marks_obtained,
              total_marks: attempt.total_marks ?? 200,
              time_spent_seconds: attempt.time_spent_seconds,
            })
            .select('id')
            .single();

          if (error || !attemptRow) throw error;
          const attemptId = attemptRow.id as string;

          // 2. Insert detailed answers if provided
          if (attempt.answers && attempt.answers.length > 0) {
            const answerRows = attempt.answers.map((a) => ({
              attempt_id: attemptId,
              user_id: user.id,
              question_id: a.question_id,
              subject_id: a.subject_id,
              user_answer: a.user_answer,
              correct_answer: a.correct_answer,
              is_correct: a.is_correct,
              time_spent_seconds: a.time_spent_seconds ?? 0,
            }));

            await db.from('attempt_answers').insert(answerRows);

            // 3. Update subject performance analytics
            const subjectStats: Record<number, { attempted: number; correct: number; wrong: number }> = {};
            attempt.answers.forEach((ans) => {
              if (!subjectStats[ans.subject_id]) {
                subjectStats[ans.subject_id] = { attempted: 0, correct: 0, wrong: 0 };
              }
              if (ans.user_answer) {
                subjectStats[ans.subject_id].attempted += 1;
                if (ans.is_correct) subjectStats[ans.subject_id].correct += 1;
                else subjectStats[ans.subject_id].wrong += 1;
              }
            });

            // Upsert per subject
            for (const [subIdStr, stat] of Object.entries(subjectStats)) {
              const subId = parseInt(subIdStr, 10);
              const { data: existing } = await db
                .from('user_subject_performance')
                .select('total_attempted, total_correct, total_wrong')
                .eq('user_id', user.id)
                .eq('subject_id', subId)
                .single();

              const prevAttempted = existing?.total_attempted ?? 0;
              const prevCorrect = existing?.total_correct ?? 0;
              const prevWrong = existing?.total_wrong ?? 0;

              await db.from('user_subject_performance').upsert(
                {
                  user_id: user.id,
                  subject_id: subId,
                  total_attempted: prevAttempted + stat.attempted,
                  total_correct: prevCorrect + stat.correct,
                  total_wrong: prevWrong + stat.wrong,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,subject_id' },
              );
            }
          }

          return attemptId;
        } catch (err) {
          console.warn('Error saving exam attempt to database:', err);
          return null;
        }
      },
    }),
    {
      name: 'bcs-library',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ recents: s.recents, bookmarks: s.bookmarks, wrongIds: s.wrongIds }),
    },
  ),
);
