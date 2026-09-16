import { create } from 'zustand';

export type MockSource = 'full' | 'subject' | 'mixed' | 'custom';
export type QuestionOrder = 'random' | 'sequential';

export interface MockConfig {
  source: MockSource;
  bcsFrom: number;
  bcsTo: number;
  questionCount: number;
  timeMinutes: number;
  subjectFilter: string; // '' = all subjects
  questionOrder: QuestionOrder;
}

interface MockState extends MockConfig {
  setSource: (s: MockSource) => void;
  setBcsFrom: (n: number) => void;
  setBcsTo: (n: number) => void;
  setQuestionCount: (n: number) => void;
  setTimeMinutes: (n: number) => void;
  setSubjectFilter: (id: string) => void;
  setQuestionOrder: (o: QuestionOrder) => void;
  reset: () => void;
}

const DEFAULTS: MockConfig = {
  source: 'full',
  bcsFrom: 10,
  bcsTo: 50,
  questionCount: 200,
  timeMinutes: 120,
  subjectFilter: '',
  questionOrder: 'random',
};

export const useMockStore = create<MockState>()((set) => ({
  ...DEFAULTS,
  setSource: (source) => set({ source }),
  setBcsFrom: (bcsFrom) => set({ bcsFrom }),
  setBcsTo: (bcsTo) => set({ bcsTo }),
  setQuestionCount: (questionCount) => set({ questionCount }),
  setTimeMinutes: (timeMinutes) => set({ timeMinutes }),
  setSubjectFilter: (subjectFilter) => set({ subjectFilter }),
  setQuestionOrder: (questionOrder) => set({ questionOrder }),
  reset: () => set(DEFAULTS),
}));
