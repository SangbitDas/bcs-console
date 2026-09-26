import { router } from 'expo-router';
import { slugsInRange } from './format';
import { usePracticeStore } from '../store/practice';
import type { RerunConfig, RecentSession } from './library';

/* Applies a saved recent-session config: restores in-progress answers when
   present, otherwise starts a fresh run, and navigates to the right route.
   Shared by the Practice hub and the full Recents list. */
export function applyRerunConfig(
  r: RerunConfig,
  savedSession: RecentSession | undefined,
  exams: { slug: string; total_questions: number }[] | undefined,
): void {
  const s = usePracticeStore.getState();
  const hasProgress = !!savedSession?.done && Object.keys(savedSession.done).length > 0;

  if (r.mode === 'bookmarks' || r.mode === 'wrong') {
    if (hasProgress) {
      s.restoreSession({
        mode: r.mode,
        done: savedSession!.done,
        right: savedSession!.right,
        wrong: savedSession!.wrong,
        idx: savedSession!.idx ?? 0,
      });
    } else {
      s.setMode(r.mode);
      s.start();
    }
    return;
  }

  if (r.mode === 'exam' && r.exam) {
    if (hasProgress) {
      s.restoreSession({
        mode: 'exam',
        exam: r.exam,
        done: savedSession!.done,
        right: savedSession!.right,
        wrong: savedSession!.wrong,
        idx: savedSession!.idx ?? 0,
      });
    } else {
      s.setMode('exam');
      s.setExam(r.exam);
      s.start();
    }
    router.push(`/practice/exam/${r.exam}` as any);
    return;
  }

  if (r.mode === 'subject') {
    const subId = r.subjects?.[0];
    if (hasProgress) {
      s.restoreSession({
        mode: 'subject',
        subjects: r.subjects,
        done: savedSession!.done,
        right: savedSession!.right,
        wrong: savedSession!.wrong,
        idx: savedSession!.idx ?? 0,
      });
    } else {
      s.setMode('subject');
      s.setSubjects(r.subjects);
      s.start();
    }
    if (subId) {
      router.push(`/practice/subject/${subId}` as any);
    } else {
      router.push('/practice/subject' as any);
    }
    return;
  }

  const selectedExams = exams ? slugsInRange(r.fromN, r.toN, exams) : [];
  if (hasProgress) {
    s.restoreSession({
      mode: r.mode,
      exam: r.exam,
      exams: selectedExams,
      subjects: r.subjects,
      fromN: r.fromN,
      toN: r.toN,
      count: r.count,
      order: r.order,
      done: savedSession!.done,
      right: savedSession!.right,
      wrong: savedSession!.wrong,
      idx: savedSession!.idx ?? 0,
    });
  } else {
    s.setMode(r.mode);
    s.setExam(r.exam);
    r.subjects.forEach((id) => {
      if (!usePracticeStore.getState().subjects.includes(id)) s.toggleSubject(id);
    });
    s.setRange(r.fromN, r.toN);
    if (exams) {
      s.selectAllExams(selectedExams);
    }
    s.setCount(r.count);
    s.setOrder(r.order);
    s.start();
  }
}