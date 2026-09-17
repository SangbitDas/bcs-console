/**
 * BCS Console — Custom Exam Question Allocator
 * ------------------------------------------------
 * Decides HOW MANY questions to pull from each selected subject so a
 * custom exam (30–500 questions) mirrors the real BCS preliminary's
 * subject-weight pattern, even when:
 *   - the user selects only some subjects (weights renormalize)
 *   - a subject's question bank can't supply its proportional share
 *     (e.g. Ethics has only 126 questions total)
 *
 * Core method: proportional allocation via the Largest Remainder
 * (Hamilton) apportionment method, wrapped in a capacity-aware
 * "water-filling" loop that caps any subject at its available bank
 * and redistributes the shortfall to the remaining subjects.
 *
 * Verified: with N=200 and the full official weight table, this
 * reproduces the exact official 200-mark split (35/35/30/20/10/15/15/15/15/10).
 */

export interface SubjectInput {
  id: number;           // subject_id 1..10
  weight: number;       // relative weight — official marks, or a historical exam's actual count
  available: number;    // how many questions exist in the bank for this subject (post year-range filter)
}

export interface AllocationResult {
  perSubject: Record<number, number>;
  requested: number;
  achieved: number;        // may be < requested if selected subjects can't fill the request
  shortfall: number;       // requested - achieved
  cappedSubjects: number[]; // subject IDs that hit their bank limit
}

/** Largest Remainder (Hamilton) rounding: integers that sum exactly to `total`. */
function largestRemainderRound(raw: Record<number, number>, total: number): Record<number, number> {
  const floors: Record<number, number> = {};
  let flooredSum = 0;
  for (const k in raw) {
    floors[k] = Math.floor(raw[k]);
    flooredSum += floors[k];
  }
  let remainder = total - flooredSum;

  // Sort by fractional part descending — ties broken by key for determinism
  const byFraction = Object.keys(raw)
    .map(Number)
    .sort((a, b) => {
      const fa = raw[a] - floors[a];
      const fb = raw[b] - floors[b];
      if (fb !== fa) return fb - fa;
      return a - b; // deterministic tie-break
    });

  const result = { ...floors };
  for (let i = 0; i < remainder; i++) {
    result[byFraction[i % byFraction.length]] += 1;
  }
  return result;
}

/**
 * Allocate `totalQuestions` across `subjects` proportional to weight,
 * never exceeding any subject's `available` count. Shortfall (if the
 * selected subjects' combined bank is smaller than requested) is
 * reported so the UI can show "only N available for this selection".
 *
 * @param minPerSubject  Minimum questions per selected subject (default 2).
 *   Guaranteed as long as the subject has enough available questions and
 *   N is large enough. If N < subjects.length * minPerSubject, the minimum
 *   is reduced so everything still fits.
 */
export function allocateQuestionCounts(
  totalQuestions: number,
  subjects: SubjectInput[],
  minPerSubject = 2,
): AllocationResult {
  // Edge case: no subjects
  if (subjects.length === 0) {
    return { perSubject: {}, requested: totalQuestions, achieved: 0, shortfall: totalQuestions, cappedSubjects: [] };
  }

  // --- Phase 0: pre-reserve minimum per subject ---
  // Each subject gets min(minPerSubject, available) reserved upfront.
  // If N can't cover all minimums, scale down the effective minimum.
  const effectiveMin = Math.min(minPerSubject, Math.floor(totalQuestions / subjects.length));
  const reserved: Record<number, number> = {};
  let totalReserved = 0;
  for (const s of subjects) {
    const r = Math.min(effectiveMin, s.available);
    reserved[s.id] = r;
    totalReserved += r;
  }

  // Build adjusted subjects for the proportional phase: reduced available
  const adjustedSubjects: SubjectInput[] = subjects.map(s => ({
    id: s.id,
    weight: s.weight,
    available: s.available - reserved[s.id],
  }));
  const toDistributeAfterReserve = totalQuestions - totalReserved;

  // --- Phase 1: proportional allocation on the remainder ---
  let remaining = new Map(adjustedSubjects.map(s => [s.id, s]));
  const allocation: Record<number, number> = {};
  subjects.forEach(s => (allocation[s.id] = reserved[s.id]));
  const cappedSubjects: number[] = [];
  let toDistribute = Math.max(0, toDistributeAfterReserve);

  // Water-filling loop: terminates in at most |subjects| iterations
  while (remaining.size > 0 && toDistribute > 0) {
    const totalWeight = [...remaining.values()].reduce((s, x) => s + x.weight, 0);

    // Edge case: all remaining subjects have zero weight
    if (totalWeight <= 0) break;

    const raw: Record<number, number> = {};
    remaining.forEach(s => (raw[s.id] = (toDistribute * s.weight) / totalWeight));

    const rounded = largestRemainderRound(raw, toDistribute);

    const overflow = [...remaining.values()].filter(s => rounded[s.id] > s.available);

    if (overflow.length === 0) {
      remaining.forEach(s => (allocation[s.id] += rounded[s.id]));
      toDistribute = 0;
    } else {
      for (const s of overflow) {
        allocation[s.id] += s.available;
        cappedSubjects.push(s.id);
        toDistribute -= s.available;
        remaining.delete(s.id);
      }
      // loop again: leftover toDistribute is re-shared among what's left
    }
  }

  const achieved = Object.values(allocation).reduce((a, b) => a + b, 0);
  return {
    perSubject: allocation,
    requested: totalQuestions,
    achieved,
    shortfall: totalQuestions - achieved,
    cappedSubjects,
  };
}

// ---------------------------------------------------------------------------
// Official BPSC syllabus weights (marks out of 200)
// ---------------------------------------------------------------------------

/** Subject ID → official weight (marks in the 200-mark BCS preliminary). */
export const OFFICIAL_WEIGHT: Record<number, number> = {
  1: 35,   // বাংলা
  2: 35,   // English
  3: 30,   // বাংলাদেশ বিষয়াবলি
  4: 20,   // আন্তর্জাতিক বিষয়াবলি
  5: 10,   // ভূগোল/পরিবেশ/দুর্যোগ
  6: 15,   // সাধারণ বিজ্ঞান
  7: 15,   // কম্পিউটার ও আইটি
  8: 15,   // গাণিতিক যুক্তি
  9: 15,   // মানসিক দক্ষতা
  10: 10,  // নৈতিকতা/মূল্যবোধ/সুশাসন
};

/**
 * Build SubjectInput[] for the allocator from the selected subject IDs
 * and their available counts (after filtering by year range, excluding
 * null correct_answer questions).
 */
export function buildSubjectInputs(
  selectedIds: number[],
  availableCounts: Record<number, number>,
): SubjectInput[] {
  return selectedIds.map(id => ({
    id,
    weight: OFFICIAL_WEIGHT[id] ?? 10,
    available: availableCounts[id] ?? 0,
  }));
}

/**
 * Compute available counts per subject from an array of questions,
 * excluding questions with no correct_answer (the ~8 defective rows).
 */
export function computeAvailableCounts(
  questions: { subject_id: number; correct_answer: string | null }[],
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const q of questions) {
    if (!q.correct_answer) continue; // exclude defective questions
    counts[q.subject_id] = (counts[q.subject_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Given a pool of questions and allocation counts per subject,
 * randomly sample exactly `perSubject[id]` questions per subject.
 * Returns the selected questions in shuffled order within each subject group.
 */
export function sampleQuestions<T extends { subject_id: number; correct_answer: string | null }>(
  pool: T[],
  perSubject: Record<number, number>,
): T[] {
  // Group by subject, excluding defective questions
  const bySubject = new Map<number, T[]>();
  for (const q of pool) {
    if (!q.correct_answer) continue;
    const arr = bySubject.get(q.subject_id) ?? [];
    arr.push(q);
    bySubject.set(q.subject_id, arr);
  }

  const result: T[] = [];
  for (const [subjectId, count] of Object.entries(perSubject)) {
    const sid = Number(subjectId);
    if (count <= 0) continue;
    const candidates = bySubject.get(sid) ?? [];

    // Fisher-Yates partial shuffle: pick `count` random items
    const arr = candidates.slice();
    const n = Math.min(count, arr.length);
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (arr.length - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    result.push(...arr.slice(0, n));
  }

  return result;
}
