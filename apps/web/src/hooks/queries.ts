import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/supabase';
import { examNum, type Exam, type QuestionRow, type Subject } from '../lib/format';

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
      return (data ?? []) as QuestionRow[];
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

      return all;
    },
  });
}
