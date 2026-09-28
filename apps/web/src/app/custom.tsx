import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { PracticeScreen } from '../components/practice-screen';
import { usePracticeStore } from '../store/practice';

export default function CustomRoute() {
  /* Leaving this tab after submit discards the finished state so that coming
     back shows the main custom-exam builder (results stay in ফলাফল).
     Mid-exam leaves go through the quit guard, which resets on its own. */
  useFocusEffect(
    useCallback(() => {
      return () => {
        const s = usePracticeStore.getState();
        if (s.mode === 'custom' && s.finished) {
          s.backToPicker();
        }
      };
    }, []),
  );

  return <PracticeScreen initialMode="custom" />;
}
