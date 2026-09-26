import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';
import { examNum, type Exam, type QuestionRow, type Subject } from '../lib/format';
import { normalizeQuestions } from '../lib/questionPatch';

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await db
        .from('subjects')
        .select('id,subject_bn,subject_en')
        .order('id');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity,
  });
}

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: async (): Promise<Exam[]> => {
      const { data, error } = await db
        .from('exams')
        .select('slug,title,total_marks,total_questions')
        .order('slug');
      if (error) throw error;
      return (data ?? []).slice().sort((a, b) => examNum(b.slug) - examNum(a.slug));
    },
    staleTime: Infinity,
  });
}

export function useBankStats() {
  return useQuery({
    queryKey: ['bank-stats'],
    queryFn: async () => {
      const [q, img, ex] = await Promise.all([
        db.from('questions').select('id', { count: 'exact', head: true }),
        db.from('questions').select('id', { count: 'exact', head: true }).eq('has_image', true),
        db.from('exams').select('slug', { count: 'exact', head: true }),
      ]);
      if (q.error) throw q.error;
      return { questions: q.count ?? 5350, withImages: img.count ?? 766, exams: ex.count ?? 41 };
    },
    staleTime: Infinity,
  });
}

export function useExamPaper(slug: string | null) {
  return useQuery({
    queryKey: ['exam-paper', slug],
    enabled: !!slug,
    queryFn: async (): Promise<QuestionRow[]> => {
      const { data, error } = await db
        .from('v_questions_with_images')
        .select('*')
        .eq('exam_slug', slug as string)
        .order('question_number')
        .limit(500);
      if (error) throw error;
      return normalizeQuestions((data ?? []) as QuestionRow[]);
    },
  });
}

export interface PoolArgs {
  key: string;
  slugs?: string[];
  subjectIds?: number[];
  ids?: number[];
  enabled: boolean;
}

/* Filtered pool for custom practice/mock (range × subjects, or id lists).
   Paginates with .range() in 1000-row chunks to bypass PostgREST max-rows cap. */
export function useQuestionPool(args: PoolArgs) {
  const { key, slugs, subjectIds, ids, enabled } = args;
  const hasScope = (slugs?.length ?? 0) > 0 || (ids?.length ?? 0) > 0;
  return useQuery({
    queryKey: ['pool', key],
    enabled: enabled && hasScope,
    staleTime: Infinity,
    queryFn: async (): Promise<QuestionRow[]> => {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 10; // Safety guard: up to 10,000 questions (full DB has 5,350)
      const all: QuestionRow[] = [];
      let page = 0;

      while (page < MAX_PAGES) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let q = db
          .from('v_questions_with_images')
          .select('*')
          .order('exam_slug', { ascending: true })
          .order('question_number', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (ids?.length) {
          q = q.in('id', ids);
        } else {
          if (slugs?.length) q = q.in('exam_slug', slugs);
          if (subjectIds?.length) q = q.in('subject_id', subjectIds);
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data ?? []) as QuestionRow[];
        all.push(...rows);

        // If returned rows are fewer than PAGE_SIZE, all matched questions have been fetched
        if (rows.length < PAGE_SIZE) break;

        page++;
      }

      return normalizeQuestions(all);
    },
  });
}

/* ---------- Exam results (ফলাফল): completed custom / mock attempts ---------- */
export interface ExamResultRow {
  id: string;
  exam_type: 'mock' | 'custom';
  title: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  marks_obtained: number;
  total_marks: number;
  time_spent_seconds: number;
  created_at: string;
}

/* Completed custom + mock attempts for the signed-in user, newest first. */
export function useExamResults(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['exam-results', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ExamResultRow[]> => {
      const { data, error } = await db
        .from('exam_attempts')
        .select(
          'id,exam_type,title,total_questions,correct_count,wrong_count,unanswered_count,marks_obtained,total_marks,time_spent_seconds,created_at',
        )
        .eq('user_id', userId as string)
        .in('exam_type', ['custom', 'mock'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ExamResultRow[];
    },
  });
}

/* A single completed attempt (for the insight screen). */
export function useExamResultDetail(id: string | null | undefined, userId: string | null | undefined) {
  return useQuery({
    queryKey: ['exam-result-detail', id, userId],
    enabled: !!id && !!userId,
    queryFn: async (): Promise<ExamResultRow | null> => {
      const { data, error } = await db
        .from('exam_attempts')
        .select(
          'id,exam_type,title,total_questions,correct_count,wrong_count,unanswered_count,marks_obtained,total_marks,time_spent_seconds,created_at',
        )
        .eq('id', id as string)
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as ExamResultRow) ?? null;
    },
  });
}

export interface SubjectStat {
  attempted: number;
  right: number;
  wrong: number;
}

/* Per-subject attempted / right / wrong, aggregated across the given attempts. */
export function useAttemptSubjectStats(attemptIds: string[], userId: string | null | undefined) {
  const key = attemptIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['attempt-subject-stats', userId, key],
    enabled: !!userId && attemptIds.length > 0,
    queryFn: async (): Promise<Record<number, SubjectStat>> => {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 10;
      const all: { subject_id: number; user_answer: string | null; is_correct: boolean }[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const { data, error } = await db
          .from('attempt_answers')
          .select('subject_id,user_answer,is_correct')
          .eq('user_id', userId as string)
          .in('attempt_id', attemptIds)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = (data ?? []) as typeof all;
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
      }

      const out: Record<number, SubjectStat> = {};
      for (const row of all) {
        const sid = Number(row.subject_id);
        if (!out[sid]) out[sid] = { attempted: 0, right: 0, wrong: 0 };
        if (row.user_answer) {
          out[sid].attempted += 1;
          if (row.is_correct) out[sid].right += 1;
          else out[sid].wrong += 1;
        }
      }
      return out;
    },
  });
}
export interface AttemptAnswerRow {
  question_id: number;
  subject_id: number;
  user_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean;
}

/* Raw per-question answers of a single attempt (for the result review lists). */
export function useAttemptAnswers(attemptId: string | null | undefined, userId: string | null | undefined) {
  return useQuery({
    queryKey: ['attempt-answers', attemptId, userId],
    enabled: !!attemptId && !!userId,
    queryFn: async (): Promise<AttemptAnswerRow[]> => {
      const PAGE_SIZE = 1000;
      const all: AttemptAnswerRow[] = [];
      for (let page = 0; page < 10; page++) {
        const from = page * PAGE_SIZE;
        const { data, error } = await db
          .from('attempt_answers')
          .select('question_id,subject_id,user_answer,correct_answer,is_correct')
          .eq('user_id', userId as string)
          .eq('attempt_id', attemptId as string)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = (data ?? []) as AttemptAnswerRow[];
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
      }
      return all;
    },
  });
}