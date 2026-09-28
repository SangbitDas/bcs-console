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
  /** Wall-clock deadline (ms since epoch) the countdown is derived from. */
  deadline: number | null;
  running: boolean;
  result: ExamResult | null;
  onSubmitExam: (() => void) | null;
  setPreset: (count: MockPresetCount) => void;
  setConfig: (p: Partial<ExamConfig>) => void;
  toggleMarked: (i: number) => void;
  begin: (poolKey: string) => void;
  ready: (minutes: number) => void;
  syncClock: () => void;
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
  deadline: null,
  running: false,
  result: null,
  onSubmitExam: null,
  setPreset: (count) =>
    set({ config: MOCK_PRESET_MAP[count] ?? MOCK_PRESET_MAP[200] }),
  setConfig: (p) => set((s) => ({ config: { ...s.config, ...p } })),
  toggleMarked: (i) =>
    set((s) => ({ marked: { ...s.marked, [i]: !s.marked[i] } })),
  begin: (poolKey) =>
    set({ poolKey, idx: 0, answers: {}, marked: {}, remain: 0, deadline: null, running: false, result: null, onSubmitExam: null }),
  ready: (minutes) =>
    set({
      idx: 0,
      answers: {},
      marked: {},
      remain: minutes * 60,
      deadline: Date.now() + minutes * 60 * 1000,
      running: true,
      result: null,
    }),
  /**
   * Recomputes `remain` from the wall-clock deadline. JS timers stop while the app is
   * backgrounded, so the countdown must be derived from a timestamp instead of a tick.
   */
  syncClock: () =>
    set((s) => {
      if (s.deadline == null) return {};
      const next = Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000));
      return next === s.remain ? {} : { remain: next };
    }),
  answer: (i, k) => set((s) => ({ answers: { ...s.answers, [i]: k } })),
  clear: (i) =>
    set((s) => {
      const next = { ...s.answers };
      delete next[i];
      return { answers: next };
    }),
  goto: (idx) => set({ idx }),
  stop: () => set({ running: false, onSubmitExam: null, deadline: null }),
  setResult: (result) => set({ result, running: false, onSubmitExam: null, deadline: null }),
  backToPicker: () =>
    set({ poolKey: '', idx: 0, answers: {}, marked: {}, remain: 0, deadline: null, running: false, result: null, onSubmitExam: null }),
  registerSubmitHandler: (fn) => set({ onSubmitExam: fn }),
}));
