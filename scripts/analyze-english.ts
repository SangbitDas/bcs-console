import * as fs from 'fs';

const rawData = fs.readFileSync('dataset/bcs_preliminary_question_bank.json', 'utf8');
const data = JSON.parse(rawData);

const eng = data.questions.filter((q: any) => q.subject_id === 2);

interface Issue {
  type: string;
  severity: 'CRITICAL' | 'MODERATE' | 'INFO';
  detail: string;
  intendedTarget?: string;
  suggestedFix?: string;
}

interface FlaggedQuestion {
  exam: string;
  examNum: number;
  qNum: number;
  id: number;
  question: string;
  correct_answer: string;
  options: { A: string; B: string; C: string; D: string };
  solve_note: string;
  issues: Issue[];
}

const MOJIBAKE_PATTERNS = ['à¦', 'à§', 'â€', 'Â\xa0', '\ufffd'];

const flagged: FlaggedQuestion[] = [];

for (const q of eng) {
  const text: string = q.question || '';
  const solve: string = q.solve_note || '';
  const opts = { A: q.option_a || '', B: q.option_b || '', C: q.option_d || '', D: q.option_d || '' };
  const rawOpts = [q.option_a, q.option_b, q.option_c, q.option_d];
  const qIssues: Issue[] = [];

  // 1. Missing underline/target formatting when question says "underlined / italicized / bold"
  if (/\b(underlined?|under-lined?|in italics?|italicized?|in bold|bold)\b/i.test(text)) {
    const hasHtmlUnderline = /<u>|<\/u>/.test(text);
    const hasMarkdownUnderline = /_[^_]+_/.test(text);
    const hasMarkdownBold = /\*[^*]+\*/.test(text);
    
    // Check if a specific target word was marked
    if (!hasHtmlUnderline && !hasMarkdownUnderline && !hasMarkdownBold) {
      // Analyze solve_note or question to deduce the intended underlined word
      let intended = '';
      
      // Look for patterns in solve_note e.g. "বাক্যে 'hard' শব্দটি..." or "'hard' হলো..." or "hard"
      const solveQuotes = solve.match(/['"‘“]([a-zA-Z\s\-]+)['"’”]/g);
      if (solveQuotes && solveQuotes.length > 0) {
        intended = solveQuotes.map(s => s.replace(/['"‘“’”]/g, '').trim()).filter(s => s.length > 0 && text.toLowerCase().includes(s.toLowerCase())).join(', ');
      }

      qIssues.push({
        type: 'MISSING_UNDERLINE_FORMATTING',
        severity: 'CRITICAL',
        detail: 'Question asks to identify or analyze the "underlined word / phrase", but NO word in the question is underlined or highlighted.',
        intendedTarget: intended ? `Deduction from solve note: "${intended}"` : 'Could not automatically deduce target word (check solve note / options)'
      });
    }
  }

  // 2. Mentions "bracket / in bracket / bracketed" without brackets
  if (/\b(bracket|in bracket|bracketed|parenthes)\b/i.test(text)) {
    const hasBrackets = /\([^\)]+\)|\[[^\]]+\]/.test(text);
    if (!hasBrackets) {
      qIssues.push({
        type: 'MISSING_BRACKET',
        severity: 'CRITICAL',
        detail: 'Question refers to words in brackets or parentheses, but no brackets are present in the sentence.'
      });
    }
  }

  // 3. Fill in the blank without blank marker (____ or ... or gap)
  if (/\b(fill in the blank|insert in the blank|appropriate word for the blank|suitable preposition for the blank|appropriate preposition for the blank|blank space)\b/i.test(text)) {
    const hasBlankMarker = /_{2,}|\.{3,}|_{1,}|\(\s*\)|\[\s*\]|---/.test(text);
    if (!hasBlankMarker) {
      qIssues.push({
        type: 'MISSING_BLANK_INDICATOR',
        severity: 'MODERATE',
        detail: 'Question instructions say "fill in the blank" or "in the blank", but the sentence does not contain any blank indicator (e.g. "______").'
      });
    }
  }

  // 4. Synonym / Antonym / Meaning without clear target word or empty quotes
  if (/\b(synonym of|antonym of|meaning of|means|noun of|verb of|adjective of|adverb of)\b/i.test(text)) {
    if (/['\"]\s*['\"]|of\s+is\b|of\s+are\b|of\s*\?|is\s*\?/i.test(text)) {
      qIssues.push({
        type: 'EMPTY_TARGET_WORD',
        severity: 'CRITICAL',
        detail: 'The target word in the question appears to be completely empty or missing (e.g. "The synonym of is...").'
      });
    }
  }

  // 5. Missing answer (defective in source)
  if (!q.correct_answer || q.correct_answer.trim() === '') {
    qIssues.push({
      type: 'NO_CORRECT_ANSWER',
      severity: 'CRITICAL',
      detail: 'Correct answer is blank in official dataset.'
    });
  }

  // 6. Empty options without question image
  const emptyOpts = rawOpts.filter((v) => !v || v.trim() === '');
  if (emptyOpts.length > 0 && (!q.question_image_paths || q.question_image_paths.length === 0)) {
    qIssues.push({
      type: 'EMPTY_OPTIONS',
      severity: 'CRITICAL',
      detail: `${emptyOpts.length} options are empty without image.`
    });
  }

  // 7. Duplicate options
  const optValues = rawOpts.map((v: string) => (v || '').trim().toLowerCase()).filter((v: string) => v.length > 0);
  const uniqueOpts = new Set(optValues);
  if (optValues.length === 4 && uniqueOpts.size < 4) {
    qIssues.push({
      type: 'DUPLICATE_OPTIONS',
      severity: 'MODERATE',
      detail: 'Two or more options have identical text.'
    });
  }

  // 8. Mojibake detection
  const hasMojibake = MOJIBAKE_PATTERNS.some(p => text.includes(p) || solve.includes(p));
  if (hasMojibake) {
    qIssues.push({
      type: 'MOJIBAKE_CORRUPTION',
      severity: 'CRITICAL',
      detail: 'Mojibake/corrupted UTF-8 bytes detected in text or explanation.'
    });
  }

  // 9. Quotation unclosed
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    qIssues.push({
      type: 'UNMATCHED_QUOTES',
      severity: 'INFO',
      detail: 'Odd number of quotation marks found in question text.'
    });
  }

  const examMatch = q.exam_slug.match(/^(\d+)/);
  const examNum = examMatch ? parseInt(examMatch[1], 10) : 0;

  if (qIssues.length > 0) {
    flagged.push({
      exam: q.exam_slug,
      examNum,
      qNum: q.question_number,
      id: q.id,
      question: text,
      correct_answer: q.correct_answer,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      solve_note: solve,
      issues: qIssues
    });
  }
}

// Sort by examNum (10 to 50), then qNum
flagged.sort((a, b) => {
  if (a.examNum !== b.examNum) return a.examNum - b.examNum;
  return a.qNum - b.qNum;
});

console.log(`Total English Questions: ${eng.length}`);
console.log(`Total Flagged: ${flagged.length}`);

// Group by issue type
const issueCounts: Record<string, number> = {};
for (const f of flagged) {
  for (const iss of f.issues) {
    issueCounts[iss.type] = (issueCounts[iss.type] || 0) + 1;
  }
}
console.log('Issue breakdown:', issueCounts);

// Group by exam
const byExam: Record<string, FlaggedQuestion[]> = {};
for (const f of flagged) {
  if (!byExam[f.exam]) byExam[f.exam] = [];
  byExam[f.exam].push(f);
}
console.log(`Exams with issues: ${Object.keys(byExam).length}`);

fs.writeFileSync('scripts/flagged_english.json', JSON.stringify(flagged, null, 2));
