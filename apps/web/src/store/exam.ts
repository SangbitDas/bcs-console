import { create } from 'zustand';
import type { OrderKind } from './practice';

export type ExamSource = 'full' | 'exam' | 'subject' | 'custom';

export interface ExamConfig {
  source: ExamSource;
  exam: string;
  exams: string[];
  fromN: number;
  toN: number;
  subjects: number[];
  count: number | null;
  minutes: number | null;
  order: OrderKind;
}

export interface ExamResult {
  score: number;
  scorable: number;
  right: number;
  wrong: number;
  skipped: number;
  excluded: number;
  auto: boolean;
  label: string;
  bySubject: Record<number, { correct: number; attempted: number }>;
  review: { qid: number; st: 'skip' | 'wrong' | 'marked'; pick?: string }[];
}

interface ExamState {
  config: ExamConfig;
  poolKey: string;
  idx: number;
  answers: Record<number, string>;
  marked: Record<number, boolean>;
  remain: number;
  running: boolean;
  result: ExamResult | null;
  setConfig: (p: Partial<ExamConfig>) => void;
  toggleSubject: (id: number) => void;
  toggleExam: (slug: string) => void;
  selectAllExams: (slugs: string[]) => void;
  clearExams: () => void;
  toggleMarked: (i: number) => void;
  begin: (poolKey: string) => void;
  ready: (minutes: number) => void;
  tick: () => void;
  answer: (i: number, k: string) => void;
  clear: (i: number) => void;
  goto: (i: number) => void;
  stop: () => void;
  setResult: (r: ExamResult) => void;
  backToPicker: () => void;
}

const DEFAULT_CONFIG: ExamConfig = {
  source: 'full',
  exam: '',
  exams: [],
  fromN: 10,
  toN: 50,
  subjects: [],
  count: 200,
  minutes: 120,
  order: 'random',
};

export const useExamStore = create<ExamState>()((set) => ({
  config: DEFAULT_CONFIG,
  poolKey: '',
  idx: 0,
  answers: {},
  marked: {},
  remain: 0,
  running: false,
  result: null,
  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  toggleSubject: (id) =>
    set((s) => ({
      config: {
        ...s.config,
        subjects: s.config.subjects.includes(id)
          ? s.config.subjects.filter((x) => x !== id)
          : [...s.config.subjects, id],
      },
    })),
  toggleMarked: (i) =>
    set((s) => ({ marked: { ...s.marked, [i]: !s.marked[i] } })),
  toggleExam: (slug) =>
    set((s) => ({
      config: {
        ...s.config,
        exams: s.config.exams.includes(slug)
          ? s.config.exams.filter((x) => x !== slug)
          : [...s.config.exams, slug],
      },
    })),
  selectAllExams: (slugs) => set((s) => ({ config: { ...s.config, exams: slugs } })),
  clearExams: () => set((s) => ({ config: { ...s.config, exams: [] } })),
  begin: (poolKey) =>
    set({ poolKey, idx: 0, answers: {}, marked: {}, remain: 0, running: false, result: null }),
  ready: (minutes) =>
    set({ idx: 0, answers: {}, marked: {}, remain: minutes * 60, running: true, result: null }),
  tick: () => set((s) => ({ remain: Math.max(0, s.remain - 1) })),
  answer: (i, k) => set((s) => ({ answers: { ...s.answers, [i]: k } })),
  clear: (i) =>
    set((s) => {
      const next = { ...s.answers };
      delete next[i];
      return { answers: next };
    }),
  goto: (idx) => set({ idx }),
  stop: () => set({ running: false }),
  setResult: (result) => set({ result, running: false }),
  backToPicker: () =>
    set({ poolKey: '', idx: 0, answers: {}, marked: {}, remain: 0, running: false, result: null }),
}));
