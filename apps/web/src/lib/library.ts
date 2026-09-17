import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  kind: 'practice' | 'mock';
  label: string;
  total: number;
  right: number;
  wrong?: number;
  score?: number;
  at: number;
  rerun?: RerunConfig;
  mockRerun?: MockRerunConfig;
}

/* Local-only library (no backend yet): recent sessions, bookmarks, wrong ids.
   Cloud sync comes with user accounts later. */
interface LibraryState {
  recents: RecentSession[];
  bookmarks: number[];
  wrongIds: number[];
  pushRecent: (r: Omit<RecentSession, 'id' | 'at'>) => void;
  toggleBookmark: (qid: number) => void;
  addWrong: (qids: number[]) => void;
  clearWrong: () => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      recents: [],
      bookmarks: [],
      wrongIds: [],
      pushRecent: (r) =>
        set((s) => ({
          recents: [
            { ...r, id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, at: Date.now() },
            ...s.recents,
          ].slice(0, 8),
        })),
      toggleBookmark: (qid) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(qid)
            ? s.bookmarks.filter((x) => x !== qid)
            : [qid, ...s.bookmarks].slice(0, 500),
        })),
      addWrong: (qids) =>
        set((s) => ({
          wrongIds: [...qids, ...s.wrongIds.filter((x) => !qids.includes(x))].slice(0, 300),
        })),
      clearWrong: () => set({ wrongIds: [] }),
    }),
    {
      name: 'bcs-library',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ recents: s.recents, bookmarks: s.bookmarks, wrongIds: s.wrongIds }),
    },
  ),
);
