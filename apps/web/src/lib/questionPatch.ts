import type { QuestionRow } from './format';

/**
 * BCS Question Bank — Frontend Quality & Integrity Normalizer
 *
 * Provides non-destructive, client-side corrections for scraped dataset defects
 * identified in the English subject audit (10th to 50th BCS):
 *
 * 1. Missing Underline / Target Highlighting (31 questions)
 * 2. Fill-in-the-Blank Glitches (raw dashes, glued words like "He–to")
 * 3. Trailing Underscores attached to words from scraper markup ("following_")
 * 4. Duplicate / Corrupted Options (10th Q23, 42nd Q63, 44th Q69, 44th Q72, 45th Q4)
 */

interface QuestionPatch {
  question?: (q: string) => string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  solve_note?: (note: string) => string;
}

/**
 * Precise, verified exam-by-exam patch registry for English questions.
 * Key format: `${exam_slug}:${question_number}`
 */
const EXACT_PATCHES: Record<string, QuestionPatch> = {
  // 10th BCS
  '10th_bcs:19': {
    question: (q) => q.replace(/‘?He–to\b/i, '‘He _____ to').replace(/He–to/i, 'He _____ to'),
  },
  '10th_bcs:23': {
    // Option C was identical to Option A in scraped dataset. Authentic distractor was "The man whom said that was a fool".
    option_c: 'The man whom said that was a fool',
  },

  // 13th BCS
  '13rd_bcs:83': {
    question: (q) => q.replace(/is not-\s*to/i, 'is not _____ to'),
  },

  // 14th BCS
  '14th_bcs:6': {
    question: (q) => q.replace(/show good manners(?:\.\s*in|\s+in)/i, '<u>show good manners</u> in'),
  },
  '14th_bcs:7': {
    question: (q) => q.replace(/turned over a new leaf/i, '<u>turned over a new leaf</u>'),
  },
  '14th_bcs:9': {
    question: (q) => q.replace(/in cold blood/i, '<u>in cold blood</u>'),
  },
  '14th_bcs:10': {
    question: (q) => q.replace(/cannot be described in words/i, '<u>cannot be described in words</u>'),
  },

  // 25th BCS
  '25th_bcs:80': {
    question: (q) => q.replace(/\bdrawing near\b/i, 'drawing <u>near</u>'),
  },
  '25th_bcs:84': {
    question: (q) => q.replace(/extremely[–—-]+when/i, 'extremely _____ when'),
  },

  // 26th BCS
  '26th_bcs:44': {
    question: (q) => q.replace(/forward\s*[–— -]+\s*you\./i, 'forward _____ you.'),
  },
  '26th_bcs:47': {
    question: (q) => q.replace(/devoid\s*[–— -]+\s*commonsense\./i, 'devoid _____ commonsense.'),
  },
  '26th_bcs:57': {
    question: (q) =>
      q.replace(/^[–— -]+\s*your shoes/i, '_____ your shoes').replace(/:\s*[–— -]+\s*your shoes/i, ': _____ your shoes'),
  },
  '26th_bcs:58': {
    question: (q) => q.replace(/He\s*[–— -]+\s*arrested/i, 'He _____ arrested'),
  },
  '26th_bcs:72': {
    question: (q) => q.replace(/blown-by/i, 'blown _____ by'),
  },

  // 28th BCS
  '28th_bcs:32': {
    question: (q) => q.replace(/waiting for the bus\./i, 'waiting <u>for the bus</u>.'),
  },

  // 30th BCS
  '30th_bcs:39': {
    question: (q) => q.replace(/their[—–-]+$/i, 'their _____'),
  },

  // 32nd BCS
  '32nd_bcs:29': {
    question: (q) => q.replace(/get his ideas across/i, '<u>get his ideas across</u>'),
  },

  // 34th BCS
  '34th_bcs:35': {
    question: (q) => q.replace(/If I - a king!/i, 'If I _____ a king!'),
  },

  // 35th BCS
  '35th_bcs:45': {
    question: (q) => q.replace(/disagreeable_?\b/i, '<u>disagreeable</u>'),
  },
  '35th_bcs:54': {
    question: (q) => q.replace(/protocol_?\b/i, '<u>protocol</u>'),
  },
  '35th_bcs:56': {
    question: (q) => q.replace(/minutes_?\b/i, '<u>minutes</u>'),
  },
  '35th_bcs:57': {
    question: (q) => q.replace(/exponentially_?\b/i, '<u>exponentially</u>'),
  },
  '35th_bcs:62': {
    question: (q) => q.replace(/periphery_?\b/i, '<u>periphery</u>'),
  },
  '35th_bcs:67': {
    question: (q) => q.replace(/material_?\b/i, '<u>material</u>'),
  },
  '35th_bcs:68': {
    question: (q) => q.replace(/hereditary\._?/i, '<u>hereditary</u>.'),
  },

  // 37th BCS
  '37th_bcs:51': {
    question: (q) => q.replace(/with all sincerity/i, '<u>with all sincerity</u>'),
  },

  // 38th BCS
  '38th_bcs:43': {
    question: (q) => q.replace(/retired_?\b/i, '<u>retired</u>'),
  },
  '38th_bcs:59': {
    question: (q) => q.replace(/Reading_?\b/i, '<u>Reading</u>'),
  },

  // 40th BCS
  '40th_bcs:52': {
    question: (q) => q.replace(/with great speed_?\./i, '<u>with great speed</u>.'),
  },

  // 41st BCS
  '41st_bcs:153': {
    question: (q) => q.replace(/To win a prize/i, '<u>To win a prize</u>'),
  },
  '41st_bcs:160': {
    question: (q) => q.replace(/\bprovided\b/i, '<u>provided</u>'),
  },

  // 42nd BCS
  '42nd_bcs:63': {
    // Option A was Caesarean, Option B was duplicate caesarean -> Authentic distractor is Caesarian
    option_b: 'Caesarian',
  },

  // 43rd BCS
  '43rd_bcs:146': {
    question: (q) => q.replace(/\bherd\b/i, '<u>herd</u>'),
  },
  '43rd_bcs:160': {
    question: (q) => q.replace(/New Market [–—-]+/i, 'New Market _____'),
  },

  // 44th BCS
  '44th_bcs:69': {
    // Option A and D both authoratative -> Option D authoretative
    option_d: 'authoretative',
  },
  '44th_bcs:72': {
    // Option A and C both "Let not the door close." -> Option C "Let the door not be closed."
    option_c: 'Let the door not be closed.',
  },
  '44th_bcs:75': {
    question: (q) => q.replace(/Sitting happily/i, '<u>Sitting happily</u>'),
  },

  // 45th BCS
  '45th_bcs:4': {
    // Option C and D both "1 million year" -> Option D "1 billion year"
    option_d: '1 billion year',
  },
  '45th_bcs:15': {
    question: (q) => q.replace(/-\s*arrogant\b/i, '<u>arrogant</u>'),
  },

  // 46th BCS
  '46th_bcs:43': {
    question: (q) => q.replace(/following_?\b/i, '<u>following</u>'),
  },
  '46th_bcs:44': {
    question: (q) => q.replace(/Writing a diary_?/i, '<u>Writing a diary</u>'),
  },
  '46th_bcs:47': {
    question: (q) => q.replace(/went back_?/i, '<u>went back</u>'),
  },
  '46th_bcs:49': {
    question: (q) => q.replace(/to depend on_?/i, '<u>to depend on</u>'),
  },
  '46th_bcs:50': {
    question: (q) => q.replace(/that he will be a B\.C\.S cadre_?/i, '<u>that he will be a B.C.S cadre</u>'),
  },

  // 47th BCS
  '47th_bcs:48': {
    question: (q) => q.replace(/why you did this/i, '<u>why you did this</u>'),
  },

  // 48th BCS
  '48th_bcs:34': {
    question: (q) => q.replace(/works hard\./i, 'works <u>hard</u>.'),
  },

  // 49th BCS
  '49th_bcs:60': {
    question: (q) => q.replace(/that the earth is a planet/i, '<u>that the earth is a planet</u>'),
  },

  // 50th BCS
  '50th_bcs:132': {
    question: (q) => q.replace(/that she recommended/i, '<u>that she recommended</u>'),
  },
};

/**
 * General cleanup for common English extraction artifacts.
 * Safe and non-destructive.
 */
function cleanGeneralEnglish(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Clean scraper artifact: trailing underscores on words if question refers to underline
  // e.g. "disagreeable_ man." -> "<u>disagreeable</u> man."
  if (/underlined|underline/i.test(cleaned) && !/<u>/.test(cleaned)) {
    cleaned = cleaned.replace(/([a-zA-Z0-9'’]+)_\b/g, '<u>$1</u>');
  }

  return cleaned;
}

/**
 * Normalizes a single QuestionRow in-memory on the frontend.
 */
export function normalizeQuestion<T extends QuestionRow>(q: T): T {
  if (!q) return q;

  const key = `${q.exam_slug}:${q.question_number}`;
  const patch = EXACT_PATCHES[key];

  let question = q.question;
  let option_a = q.option_a;
  let option_b = q.option_b;
  let option_c = q.option_c;
  let option_d = q.option_d;
  let solve_note = q.solve_note;

  // Apply exact verified patches if matched
  if (patch) {
    if (patch.question && question) {
      question = patch.question(question);
    }
    if (patch.option_a !== undefined) option_a = patch.option_a;
    if (patch.option_b !== undefined) option_b = patch.option_b;
    if (patch.option_c !== undefined) option_c = patch.option_c;
    if (patch.option_d !== undefined) option_d = patch.option_d;
    if (patch.solve_note && solve_note) {
      solve_note = patch.solve_note(solve_note);
    }
  } else if (q.subject_id === 2 && question) {
    // Only apply general English cleaner if no exact patch matched
    question = cleanGeneralEnglish(question);
  }

  // If nothing changed, return original object for reference equality
  if (
    question === q.question &&
    option_a === q.option_a &&
    option_b === q.option_b &&
    option_c === q.option_c &&
    option_d === q.option_d &&
    solve_note === q.solve_note
  ) {
    return q;
  }

  return {
    ...q,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    solve_note,
  };
}

/**
 * Normalizes an array of QuestionRows.
 */
export function normalizeQuestions<T extends QuestionRow>(questions: T[]): T[] {
  if (!questions || !Array.isArray(questions)) return [];
  return questions.map((q) => normalizeQuestion(q));
}
