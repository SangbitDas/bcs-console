import * as fs from 'fs';

const raw = JSON.parse(fs.readFileSync('dataset/bcs_preliminary_question_bank.json', 'utf8'));
const questions = raw.questions.filter((q: any) => q.subject_id === 2);

interface BlankIssue {
  exam_slug: string;
  examNum: number;
  qNum: number;
  question: string;
  correct_answer: string;
  options: { A: string; B: string; C: string; D: string };
  solve_note: string;
  issueType: 'NO_BLANK_MARKER' | 'DASH_ATTACHED_TO_WORD' | 'DASH_AS_GAP' | 'MALFORMED_GAP';
  detail: string;
  suggestedFormattedSentence: string;
}

const blankIssues: BlankIssue[] = [];

for (const q of questions) {
  const text: string = q.question || '';
  const solve: string = q.solve_note || '';
  const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  const examMatch = q.exam_slug.match(/^(\d+)/);
  const examNum = examMatch ? parseInt(examMatch[1], 10) : 0;

  // Case 1: Instructions explicitly say "fill in the blank / preposition / right form / insert" but NO gap or dash or underscore in sentence
  const hasBlankInstruction = /\b(fill in the blank|insert in the blank|in the blank|blank space|preposition)\b/i.test(text);
  const hasGapMarker = /_{2,}|\.{3,}|[-–—]{1,}|_{1,}/.test(text);

  if (hasBlankInstruction && !hasGapMarker) {
    blankIssues.push({
      exam_slug: q.exam_slug,
      examNum,
      qNum: q.question_number,
      question: text,
      correct_answer: q.correct_answer,
      options: opts,
      solve_note: solve,
      issueType: 'NO_BLANK_MARKER',
      detail: 'Question explicitly asks for a blank fill-in/preposition, but the sentence has NO blank line, underscore, or gap placeholder at all.',
      suggestedFormattedSentence: 'Insert "_____" at the appropriate position in the sentence.'
    });
    continue;
  }

  // Case 2: Dash is glued/attached to a word without spaces (e.g. "not- to understand", "devoid-commonsense", "If I - a king")
  const dashGluedMatch = text.match(/[a-zA-Z]+[-–—]+[a-zA-Z]+/g);
  if (dashGluedMatch) {
    // Check if these are genuine hyphenated words like "well-known" or if they are blank gaps
    const potentialGaps = dashGluedMatch.filter(m => !/\b(pre-emin|co-ordin|well-|self-|non-|anti-|post-|mid-|twenty-|thirty-|forty-|fifty-|sixty-|seventy-|eighty-|ninety-)/i.test(m));
    if (potentialGaps.length > 0) {
      blankIssues.push({
        exam_slug: q.exam_slug,
        examNum,
        qNum: q.question_number,
        question: text,
        correct_answer: q.correct_answer,
        options: opts,
        solve_note: solve,
        issueType: 'DASH_ATTACHED_TO_WORD',
        detail: `Dash placeholder is attached directly to words without spacing: ${potentialGaps.join(', ')}`,
        suggestedFormattedSentence: text.replace(/([a-zA-Z]+)[-–—]+([a-zA-Z]+)/g, '$1 _____ $2')
      });
      continue;
    }
  }

  // Case 3: Inconsistent dash gap styles (e.g. "––––", "---", "–", "—") used as blank
  if (/[-–—]{2,}/.test(text)) {
    blankIssues.push({
      exam_slug: q.exam_slug,
      examNum,
      qNum: q.question_number,
      question: text,
      correct_answer: q.correct_answer,
      options: opts,
      solve_note: solve,
      issueType: 'DASH_AS_GAP',
      detail: `Uses non-standard dashes/hyphens (${text.match(/[-–—]{2,}/g)?.join(', ')}) instead of clean underline '______'`,
      suggestedFormattedSentence: text.replace(/[-–—]{2,}/g, '______')
    });
  }
}

blankIssues.sort((a, b) => a.examNum !== b.examNum ? a.examNum - b.examNum : a.qNum - b.qNum);

console.log(`Total Blank-related issues found: ${blankIssues.length}`);
const counts: Record<string, number> = {};
for (const b of blankIssues) counts[b.issueType] = (counts[b.issueType] || 0) + 1;
console.log('Breakdown:', counts);

fs.writeFileSync('scripts/blank_issues_detailed.json', JSON.stringify(blankIssues, null, 2));
