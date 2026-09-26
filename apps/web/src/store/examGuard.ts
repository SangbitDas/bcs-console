import { create } from 'zustand';
import { useExamStore } from './exam';
import { usePracticeStore } from './practice';

interface ExamGuardState {
  showQuitModal: boolean;
  pendingNavigation: (() => void) | null;
  customRemain: number;
  customTotal: number;
  customSubmit: (() => void) | null;
  openQuitModal: (onConfirm?: () => void) => void;
  closeQuitModal: () => void;
  confirmQuit: () => void;
  setCustomRemain: (remain: number) => void;
  setCustomLive: (params: { total?: number; onSubmit?: (() => void) | null }) => void;
}

export const useExamGuardStore = create<ExamGuardState>((set, get) => ({
  showQuitModal: false,
  pendingNavigation: null,
  customRemain: 0,
  customTotal: 0,
  customSubmit: null,
  openQuitModal: (onConfirm) => set({ showQuitModal: true, pendingNavigation: onConfirm ?? null }),
  closeQuitModal: () => set({ showQuitModal: false, pendingNavigation: null }),
  setCustomRemain: (customRemain) => set({ customRemain }),
  setCustomLive: ({ total, onSubmit }) =>
    set((s) => ({
      customTotal: total !== undefined ? total : s.customTotal,
      customSubmit: onSubmit !== undefined ? onSubmit : s.customSubmit,
    })),
  confirmQuit: () => {
    const nav = get().pendingNavigation;

    // 1. Reset Mock Exam if running (No DB save, no result created)
    if (useExamStore.getState().running) {
      useExamStore.getState().backToPicker();
    }

    // 2. Reset Custom Exam if running (No DB save, no result created)
    const pState = usePracticeStore.getState();
    if (pState.mode === 'custom' && pState.started && !pState.finished) {
      pState.backToPicker();
    }

    set({
      showQuitModal: false,
      pendingNavigation: null,
      customRemain: 0,
      customTotal: 0,
      customSubmit: null,
    });

    if (nav) {
      nav();
    }
  },
}));

/**
 * Returns true if any mock or custom exam is actively in progress.
 */
export function isAnyExamActive(): boolean {
  const isMockRunning = useExamStore.getState().running;
  const pState = usePracticeStore.getState();
  const isCustomRunning = pState.mode === 'custom' && pState.started && !pState.finished;
  return isMockRunning || isCustomRunning;
}
