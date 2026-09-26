import { create } from 'zustand';

export type MockPresetCount = 200 | 120 | 100 | 60;

export const MOCK_PRESET_MAP: Record<MockPresetCount, { count: MockPresetCount; minutes: number }> = {
  200: { count: 200, minutes: 120 },
  120: { count: 120, minutes: 72 },
  100: { count: 100, minutes: 60 },
  60: { count: 60, minutes: 36 },
};

export interface ExamConfig {
  count: MockPresetCount;
  minutes: number;
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
  onSubmitExam: (() => void) | null;
  setPreset: (count: MockPresetCount) => void;
  setConfig: (p: Partial<ExamConfig>) => void;
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
  registerSubmitHandler: (fn: (() => void) | null) => void;
}

const DEFAULT_CONFIG: ExamConfig = {
  count: 200,
  minutes: 120,
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
  onSubmitExam: null,
  setPreset: (count) =>
    set({ config: MOCK_PRESET_MAP[count] ?? MOCK_PRESET_MAP[200] }),
  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  toggleMarked: (i) =>
    set((s) => ({ marked: { ...s.marked, [i]: !s.marked[i] } })),
  begin: (poolKey) =>
    set({ poolKey, idx: 0, answers: {}, marked: {}, remain: 0, running: false, result: null, onSubmitExam: null }),
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
  stop: () => set({ running: false, onSubmitExam: null }),
  setResult: (result) => set({ result, running: false, onSubmitExam: null }),
  backToPicker: () =>
    set({ poolKey: '', idx: 0, answers: {}, marked: {}, remain: 0, running: false, result: null, onSubmitExam: null }),
  registerSubmitHandler: (fn) => set({ onSubmitExam: fn }),
}));
