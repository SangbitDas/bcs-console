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
  key: string;
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
  pinned?: boolean;
  pinnedAt?: number;
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

const RECENT_KEEP = 30;

/* Stable identity for a recent session. Recents are deduped (and cloud-merged)
   by this key, so the same practice config never produces duplicates even
   across devices. */
export function recentKey(r: {
  kind: RecentSession['kind'];
  label?: string;
  rerun?: RerunConfig;
  mockRerun?: MockRerunConfig;
}): string {
  const subs = (r.rerun?.subjects ?? []).slice().map(Number).sort((a, b) => a - b).join(',');
  return [
    r.kind,
    r.rerun?.mode ?? '',
    r.rerun?.exam ?? '',
    subs,
    r.rerun?.fromN ?? '',
    r.rerun?.toN ?? '',
    r.rerun?.count ?? '',
    r.rerun?.order ?? '',
    r.mockRerun ? JSON.stringify(r.mockRerun) : '',
    r.label ?? '',
  ].join('|');
}

/* Pinned first (newest pin wins), then most recent activity. */
export function sortRecents(list: RecentSession[]): RecentSession[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (ap === 1 && bp === 1 && (a.pinnedAt ?? 0) !== (b.pinnedAt ?? 0)) {
      return (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0);
    }
    return (b.at ?? 0) - (a.at ?? 0);
  });
}

/* Never evict pinned sessions; keep the newest RECENT_KEEP unpinned ones. */
export function pruneRecents(list: RecentSession[]): RecentSession[] {
  const sorted = sortRecents(list);
  const pinned = sorted.filter((r) => r.pinned);
  const rest = sorted.filter((r) => !r.pinned).slice(0, RECENT_KEEP);
  return [...pinned, ...rest];
}

function mergeDone(
  a?: RecentSession['done'],
  b?: RecentSession['done'],
): RecentSession['done'] {
  if (!a && !b) return undefined;
  return { ...(a ?? {}), ...(b ?? {}) };
}

/* Merge local (on-device) and cloud recents by session key.
   Newest activity wins for counts; pins are a union; done maps are combined. */
export function mergeRecents(local: RecentSession[], cloud: RecentSession[]): RecentSession[] {
  const byKey = new Map<string, RecentSession>();
  const upsert = (r: RecentSession) => {
    const existing = byKey.get(r.key);
    if (!existing) {
      byKey.set(r.key, r);
      return;
    }
    const newer = (r.at ?? 0) >= (existing.at ?? 0) ? r : existing;
    const older = newer === r ? existing : r;
    const pinned = !!existing.pinned || !!r.pinned;
    byKey.set(r.key, {
      ...newer,
      id: existing.id || newer.id,
      pinned,
      pinnedAt: pinned ? Math.max(existing.pinnedAt ?? 0, r.pinnedAt ?? 0) || undefined : undefined,
      completed: !!existing.completed || !!r.completed,
      wrong: newer.wrong ?? older.wrong,
      done: mergeDone(older.done, newer.done),
    });
  };
  local.forEach(upsert);
  cloud.forEach(upsert);
  return pruneRecents(Array.from(byKey.values()));
}

function toCloudRow(s: RecentSession, userId: string) {
  return {
    user_id: userId,
    session_key: s.key,
    kind: s.kind,
    label: s.label ?? '',
    total: s.total ?? 0,
    right_count: s.right ?? 0,
    wrong_count: s.wrong ?? 0,
    score: s.score ?? null,
    rerun: s.rerun ?? null,
    mock_rerun: s.mockRerun ?? null,
    done: s.done ?? null,
    idx: s.idx ?? null,
    completed: !!s.completed,
    is_pinned: !!s.pinned,
    pinned_at: s.pinned ? new Date(s.pinnedAt ?? Date.now()).toISOString() : null,
    last_active_at: new Date(s.at ?? Date.now()).toISOString(),
  };
}

function fromCloudRow(row: any): RecentSession {
  return {
    id: String(row.id ?? `${row.session_key}-cloud`),
    key: String(row.session_key),
    kind: row.kind,
    label: row.label ?? '',
    total: Number(row.total ?? 0),
    right: Number(row.right_count ?? 0),
    wrong: row.wrong_count == null ? undefined : Number(row.wrong_count),
    score: row.score == null ? undefined : Number(row.score),
    at: row.last_active_at ? Date.parse(row.last_active_at) : Date.now(),
    rerun: row.rerun ?? undefined,
    mockRerun: row.mock_rerun ?? undefined,
    done: row.done ?? undefined,
    idx: row.idx == null ? undefined : Number(row.idx),
    completed: !!row.completed,
    pinned: !!row.is_pinned,
    pinnedAt: row.pinned_at ? Date.parse(row.pinned_at) : undefined,
  };
}

interface LibraryState {
  recents: RecentSession[];
  bookmarks: number[];
  wrongIds: number[];
  wrongCounts: Record<number, number>;
  pushRecent: (r: Omit<RecentSession, 'id' | 'at' | 'key'>) => void;
  togglePinRecent: (key: string) => Promise<void>;
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
      wrongCounts: {},

      pushRecent: (r) => {
        const key = recentKey(r);
        const now = Date.now();

        set((s) => {
          const matchIdx = s.recents.findIndex((item) => item.key === key);
          const nextRecents = [...s.recents];

          if (matchIdx >= 0) {
            const existing = nextRecents[matchIdx];
            const updated: RecentSession = {
              ...existing,
              ...r,
              id: existing.id,
              key,
              at: now,
              // A pin is a user preference - never lose it when the session updates.
              pinned: existing.pinned,
              pinnedAt: existing.pinnedAt,
              done: { ...(existing.done || {}), ...(r.done || {}) },
            };
            nextRecents.splice(matchIdx, 1);
            nextRecents.unshift(updated);
          } else {
            nextRecents.unshift({
              ...r,
              id: `${now}-${Math.floor(Math.random() * 1e6)}`,
              key,
              at: now,
            });
          }

          return { recents: pruneRecents(nextRecents) };
        });

        // Fire-and-forget cloud write-through for signed-in users.
        const user = useAuthStore.getState().user;
        if (!user) return;
        const session = get().recents.find((x) => x.key === key);
        if (!session) return;
        void (async () => {
          try {
            await db
              .from('user_recent_sessions')
              .upsert(toCloudRow(session, user.id), { onConflict: 'user_id,session_key' });
          } catch (err) {
            console.warn('Error syncing recent to cloud:', err);
          }
        })();
      },

      togglePinRecent: async (key) => {
        // 1. Optimistic local update (pin floats to the top of the list).
        set((s) => ({
          recents: pruneRecents(
            s.recents.map((r) =>
              r.key === key
                ? { ...r, pinned: !r.pinned, pinnedAt: !r.pinned ? Date.now() : undefined }
                : r,
            ),
          ),
        }));

        // 2. Cloud sync if authenticated.
        const user = useAuthStore.getState().user;
        if (!user) return;
        const session = get().recents.find((x) => x.key === key);
        if (!session) return;
        try {
          await db
            .from('user_recent_sessions')
            .upsert(toCloudRow(session, user.id), { onConflict: 'user_id,session_key' });
        } catch (err) {
          console.warn('Error syncing pin to cloud:', err);
        }
      },

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
        // 1. Optimistic local update: keep the unresolved set + bump lifetime counts.
        set((s) => {
          const wrongIds = [...qids, ...s.wrongIds.filter((x) => !qids.includes(x))].slice(0, 300);
          const wrongCounts = { ...s.wrongCounts };
          qids.forEach((qid) => {
            wrongCounts[qid] = (wrongCounts[qid] ?? 0) + 1;
          });
          return { wrongIds, wrongCounts };
        });

        // 2. Cloud sync if authenticated: atomic increment via RPC (see migration
        //    20260926000100_record_mistakes.sql).
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          await db.rpc('record_mistakes', { p_question_ids: qids });
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

          // 2b. Merge lifetime wrong counts (mistake bank). Counts are merged with
          //     max() so repeated syncs never double-count.
          const { data: cloudCountRows } = await db
            .from('user_mistakes')
            .select('question_id,wrong_count')
            .eq('user_id', user.id);

          const cloudCounts: Record<number, number> = {};
          ((cloudCountRows ?? []) as any[]).forEach((m) => {
            cloudCounts[Number(m.question_id)] = Number(m.wrong_count ?? 0);
          });

          const localCounts = get().wrongCounts;
          const mergedCounts: Record<number, number> = { ...localCounts };
          Object.keys(cloudCounts).forEach((k) => {
            const qid = Number(k);
            mergedCounts[qid] = Math.max(mergedCounts[qid] ?? 0, cloudCounts[qid]);
          });
          set({ wrongCounts: mergedCounts });

          const countsToPush = Object.entries(mergedCounts)
            .map(([k, v]) => ({ question_id: Number(k), wrong_count: v }))
            .filter((row) => row.wrong_count > (cloudCounts[row.question_id] ?? 0));
          if (countsToPush.length > 0) {
            await db.from('user_mistakes').upsert(
              countsToPush.map((row) => ({
                user_id: user.id,
                question_id: row.question_id,
                wrong_count: row.wrong_count,
              })),
              { onConflict: 'user_id,question_id' },
            );
          }

          // 3. Sync recent sessions (pinned + history) both ways.
          const { data: cloudRecents } = await db
            .from('user_recent_sessions')
            .select('*')
            .eq('user_id', user.id);

          const cloudSessions = ((cloudRecents ?? []) as any[]).map(fromCloudRow);
          const merged = mergeRecents(get().recents, cloudSessions);
          set({ recents: merged });

          // Upload the merged set so both sides converge (idempotent upsert).
          if (merged.length > 0) {
            await db
              .from('user_recent_sessions')
              .upsert(merged.map((r) => toCloudRow(r, user.id)), {
                onConflict: 'user_id,session_key',
              });
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
      version: 3,
      // v1 recents had no stable `key`; v3 adds lifetime wrong counts.
      migrate: (persisted: any) => {
        const state = persisted ?? {};
        const recents: RecentSession[] = ((state.recents ?? []) as any[]).map((r) => ({
          ...r,
          key: r.key ?? recentKey(r),
          pinned: !!r.pinned,
        }));
        const wrongIds: number[] = state.wrongIds ?? [];
        const wrongCounts: Record<number, number> =
          state.wrongCounts ?? Object.fromEntries(wrongIds.map((id) => [id, 1] as const));
        return { ...state, recents: pruneRecents(recents), wrongCounts };
      },
      partialize: (s) => ({
        recents: s.recents,
        bookmarks: s.bookmarks,
        wrongIds: s.wrongIds,
        wrongCounts: s.wrongCounts,
      }),
    },
  ),
);
