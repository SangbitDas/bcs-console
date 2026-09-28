import { create } from 'zustand';

/* Per-question ব্যাখ্যা (explanation) open-state, keyed by stable question id.
 *
 * WHY NOT LOCAL useState: FlashList v2 recycles cells by position — a
 * useState inside QuestionCard sticks to the recycled cell, so opening Q1–Q4
 * made unrelated questions below show their explanations after scrolling,
 * and the global reveal-all button could never close them again.
 * External keyed state is immune: every rendered card reads open[its own id].
 * Cards subscribe to their own id only, so toggling one never re-renders
 * the list (same pattern as practice `done` answers).
 */
interface NoteOpenState {
  open: Record<number, boolean>;
  toggle: (qid: number) => void;
  setMany: (qids: number[], v: boolean) => void;
  clear: () => void;
}

export const useNoteStore = create<NoteOpenState>()((set) => ({
  open: {},
  toggle: (qid) =>
    set((s) => ({ open: { ...s.open, [qid]: !s.open[qid] } })),
  setMany: (qids, v) =>
    set((s) => {
      const open = { ...s.open };
      for (const id of qids) {
        if (v) open[id] = true;
        else delete open[id];
      }
      return { open };
    }),
  clear: () => set({ open: {} }),
}));
