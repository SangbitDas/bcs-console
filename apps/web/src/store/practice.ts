import { create } from 'zustand';

export type PracticeMode = 'exam' | 'subject' | 'custom' | 'bookmarks' | 'wrong';
export type OrderKind = 'seq' | 'random';

export interface PracticeDone {
  pick: string | null;
  ok: boolean;
  reveal?: boolean;
}

interface PracticeState {
  mode: PracticeMode | null;
  exam: string;
  exams: string[];
  subjects: number[];
  fromN: number;
  toN: number;
  count: number | null;
  order: OrderKind;
  started: boolean;
  finished: boolean;
  runId: number;
  idx: number;
  right: number;
  wrong: number;
  done: Record<number, PracticeDone>;
  setMode: (m: PracticeMode | null) => void;
  setExam: (slug: string) => void;
  setExams: (slugs: string[]) => void;
  toggleExam: (slug: string) => void;
  selectAllExams: (slugs: string[]) => void;
  clearExams: () => void;
  toggleSubject: (id: number) => void;
  setRange: (from: number, to: number) => void;
  setCount: (c: number | null) => void;
  setOrder: (o: OrderKind) => void;
  start: () => void;
  answer: (qid: number, pick: string, ok: boolean) => void;
  reveal: (qid: number) => void;
  next: (len: number) => void;
  prev: () => void;
  finish: () => void;
  backToPicker: () => void;
  backToHub: () => void;
}

export const usePracticeStore = create<PracticeState>()((set) => ({
  mode: null,
  exam: '',
  exams: [],
  subjects: [],
  fromN: 10,
  toN: 50,
  count: null,
  order: 'seq',
  started: false,
  finished: false,
  runId: 0,
  idx: 0,
  right: 0,
  wrong: 0,
  done: {},
  setMode: (mode) => set({ mode, started: false, finished: false }),
  setExam: (exam) => set({ exam }),
  setExams: (exams) => set({ exams }),
  toggleExam: (slug) =>
    set((s) => ({
      exams: s.exams.includes(slug)
        ? s.exams.filter((x) => x !== slug)
        : [...s.exams, slug],
    })),
  selectAllExams: (slugs) => set({ exams: slugs }),
  clearExams: () => set({ exams: [] }),
  toggleSubject: (id) =>
    set((s) => ({
      subjects: s.subjects.includes(id) ? s.subjects.filter((x) => x !== id) : [...s.subjects, id],
    })),
  setRange: (fromN, toN) => set({ fromN, toN }),
  setCount: (count) => set({ count }),
  setOrder: (order) => set({ order }),
  start: () =>
    set((s) => ({ started: true, finished: false, idx: 0, right: 0, wrong: 0, done: {}, runId: s.runId + 1 })),
  answer: (qid, pick, ok) =>
    set((s) => ({
      done: { ...s.done, [qid]: { pick, ok } },
      right: s.right + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    })),
  reveal: (qid) =>
    set((s) => ({
      done: { ...s.done, [qid]: { pick: null, ok: false, reveal: true } },
      wrong: s.wrong + 1,
    })),
  next: (len) => set((s) => ({ idx: Math.min(s.idx + 1, Math.max(0, len - 1)) })),
  prev: () => set((s) => ({ idx: Math.max(s.idx - 1, 0) })),
  finish: () => set({ finished: true }),
  backToPicker: () => set({ started: false, finished: false }),
  backToHub: () => set({ mode: null, started: false, finished: false }),
}));
