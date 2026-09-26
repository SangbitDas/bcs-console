import * as fs from 'fs';

const raw = JSON.parse(fs.readFileSync('dataset/bcs_preliminary_question_bank.json', 'utf8'));
const questions = raw.questions.filter((q: any) => q.subject_id === 2);

interface BlankCheckResult {
  exam_slug: string;
  qNum: number;
  question: string;
  options: string[];
  correct_answer: string;
  solve_note: string;
  hasStandardBlank: boolean; // has ____ or ___ (at least 3 underscores)
  hasDashAsBlank: boolean; // has - or – or — as blank
  hasNoBlankAtAll: boolean; // mentions blank / complete / preposition but has no gap indicator
  dashPattern?: string;
  diagnosis: string;
  suggestedSentence: string;
}

const results: BlankCheckResult[] = [];

// Keywords that indicate fill in the blank / insertion
const BLANK_KEYWORDS = [
  'blank', 'fill in', 'insert', 'gap', 'complete the sentence',
  'completes the sentence', 'appropriate preposition', 'suitable preposition',
  'correct preposition', 'appropriate word', 'suitable word', 'right word',
  'best fits', 'fits best', 'fits in', 'right option'
];

for (const q of questions) {
  const text: string = q.question || '';
  const lower = text.toLowerCase();

  const isBlankStyle = BLANK_KEYWORDS.some(k => lower.includes(k)) ||
    /_{2,}|\.{3,}|[-–—]{1,}/.test(text);

  if (!isBlankStyle) continue;

  const hasStandardUnderscores = /_{3,}/.test(text);
  const hasMultipleDots = /\.{3,}/.test(text);
  const hasDashes = /[-–—]{1,}/.test(text);
  const hasShortUnderscore = /_{1,2}/.test(text);

  let diagnosis = '';
  let hasStandardBlank = hasStandardUnderscores || hasMultipleDots;
  let hasDashAsBlank = false;
  let hasNoBlankAtAll = false;
  let dashPattern = '';

  // Check if dashes are used instead of blanks e.g. "devoid –––– commonsense" or "not- to understand" or "is a period of–––"
  if (hasDashes && !hasStandardBlank) {
    hasDashAsBlank = true;
    const match = text.match(/[-–—]{1,}/g);
    dashPattern = match ? match.join(', ') : '';
    diagnosis = `Uses hyphen/dash/en-dash (${dashPattern}) instead of standard blank '______'`;
  } else if (!hasStandardBlank && !hasDashes && !hasShortUnderscore) {
    hasNoBlankAtAll = true;
    diagnosis = `No blank indicator or gap placeholder present at all in the sentence.`;
  } else if (hasShortUnderscore && !hasStandardUnderscores) {
    diagnosis = `Uses single/double underscore '_' instead of standard '______'`;
  }

  if (diagnosis) {
    results.push({
      exam_slug: q.exam_slug,
      qNum: q.question_number,
      question: text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correct_answer: q.correct_answer,
      solve_note: q.solve_note,
      hasStandardBlank,
      hasDashAsBlank,
      hasNoBlankAtAll,
      dashPattern,
      diagnosis,
      suggestedSentence: ''
    });
  }
}

console.log(`Total English Questions: ${questions.length}`);
console.log(`Total Blank-style questions with imperfect/missing blank markers: ${results.length}`);

// Group by category
const noBlank = results.filter(r => r.hasNoBlankAtAll);
const dashBlank = results.filter(r => r.hasDashAsBlank);

console.log(`- Completely missing blank marker: ${noBlank.length}`);
console.log(`- Uses dash/hyphen as blank: ${dashBlank.length}`);

fs.writeFileSync('scripts/fill_in_blank_audit.json', JSON.stringify(results, null, 2));
