import * as fs from 'fs';

interface Question {
  id: number;
  question_number: number;
  subject_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  solve_note: string;
  question_image_paths: string[];
  solve_note_image_paths: string[];
  exam_slug: string;
}

interface ExamData {
  slug: string;
  title: string;
  date: string;
  total_marks: number;
  set_code: string;
  total_questions: number;
  actual_questions: number;
}

const raw = JSON.parse(fs.readFileSync('dataset/bcs_preliminary_question_bank.json', 'utf8'));
const questions: Question[] = raw.questions;
const exams: ExamData[] = raw.exams;

interface ExamFinding {
  qNum: number;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  issueCategory: string;
  issueDetail: string;
  intendedTargetOrCorrection: string;
  solveNoteSnippet: string;
}

const EXACT_TARGET_MAP: Record<string, Record<number, string>> = {
  '14th_bcs': {
    6: 'Target expression: **"show good manners"** (Meaning: behave gently)',
    7: 'Target idiom: **"turned over a new leaf"** (Meaning: opened a new chapter)',
    9: 'Target idiom: **"in cold blood"** (Meaning: in cool brain and calculated thought)',
    10: 'Target expression: **"cannot be described in words"** (Equivalent: beggars description)'
  },
  '25th_bcs': {
    80: 'Target word: **"near"** (Part of speech: Adverb modifying drawing)'
  },
  '28th_bcs': {
    32: 'Target phrase: **"waiting for the bus"** / **"for the bus"** (Noun phrase / Prepositional phrase)'
  },
  '32nd_bcs': {
    29: 'Target phrase: **"get his ideas across"** (Meaning: make his ideas understood)'
  },
  '35th_bcs': {
    45: 'Target word: **"disagreeable"** (Part of speech: Adjective)',
    54: 'Target word: **"protocol"** (Meaning: Record of rules)',
    56: 'Target word: **"minutes"** (Meaning: written record of a meeting)',
    57: 'Target word: **"exponentially"** (Meaning: rapidly)',
    62: 'Target word: **"periphery"** (Meaning: marginal areas)',
    67: 'Target word: **"material"** (Part of speech: Noun)',
    68: 'Target word: **"hereditary"** (Part of speech: Adjective)'
  },
  '37th_bcs': {
    51: 'Target phrase: **"with all sincerity"** (Type: Adverbial phrase)'
  },
  '38th_bcs': {
    43: 'Target word: **"retired"** (Part of speech/form: Participle)',
    59: 'Target word: **"Reading"** (Part of speech/form: Gerund)'
  },
  '40th_bcs': {
    52: 'Target phrase: **"with great speed"** (Type: Adverb phrase)'
  },
  '41st_bcs': {
    153: 'Target phrase: **"To win a prize"** (Type: Noun phrase acting as subject)',
    160: 'Target word: **"provided"** (Part of speech: Conjunction)'
  },
  '43rd_bcs': {
    146: 'Target word: **"herd"** (Part of speech: Collective noun)'
  },
  '44th_bcs': {
    75: 'Target phrase: **"Sitting happily"** (Type: Subordinate clause / Participial clause)'
  },
  '45th_bcs': {
    15: 'Target word: **"arrogant"** (Meaning: rude)'
  },
  '46th_bcs': {
    43: 'Target word: **"following"** (Part of speech: Preposition)',
    44: 'Target phrase: **"Writing a diary"** (Type: Noun phrase)',
    47: 'Target phrase: **"went back"** (Meaning: withdrew from promise)',
    50: 'Target clause: **"that he will be a B.C.S cadre"** (Type: Noun clause)'
  },
  '47th_bcs': {
    48: 'Target clause: **"why you did this"** (Type: Noun clause acting as object of Tell)'
  },
  '48th_bcs': {
    34: 'Target word: **"hard"** (Part of speech: Adverb modifying works)'
  },
  '49th_bcs': {
    60: 'Target clause: **"that the earth is a planet"** (Type: Noun clause acting as object of know)'
  },
  '50th_bcs': {
    132: 'Target clause: **"that she recommended"** (Type: Relative / Adjective clause modifying book)'
  }
};

const findingsByExam: Record<string, ExamFinding[]> = {};

const sortedExams = [...exams].sort((a, b) => {
  const na = parseInt(a.slug.match(/^(\d+)/)?.[1] || '0', 10);
  const nb = parseInt(b.slug.match(/^(\d+)/)?.[1] || '0', 10);
  return na - nb;
});

for (const exam of sortedExams) {
  findingsByExam[exam.slug] = [];
  const engQs = questions.filter(q => q.exam_slug === exam.slug && q.subject_id === 2);
  engQs.sort((a, b) => a.question_number - b.question_number);

  for (const q of engQs) {
    const text = q.question || '';
    const solve = q.solve_note || '';
    const opts = { A: q.option_a || '', B: q.option_b || '', C: q.option_c || '', D: q.option_d || '' };
    const rawOpts = [q.option_a, q.option_b, q.option_c, q.option_d];

    // 1. Missing underline / highlight formatting
    if (/\b(underlined?|under-lined?|in italics?|italicized?|bold|in bold)\b/i.test(text)) {
      const hasProperMarkup = /<u>|<\/u>|\*[^*]+\*|_[^_]+_/.test(text);
      if (!hasProperMarkup) {
        const exactTarget = EXACT_TARGET_MAP[exam.slug]?.[q.question_number];
        const fix = exactTarget
          ? `${exactTarget}. Underline or highlight this in question text.`
          : 'Inspect sentence/solve note context to locate and underline target word.';

        findingsByExam[exam.slug].push({
          qNum: q.question_number,
          questionText: text,
          options: opts,
          correctAnswer: q.correct_answer,
          issueCategory: 'Missing Underline / Target Highlighting',
          issueDetail: 'Question explicitly asks about an "underlined word / phrase / clause", but the target text is plain text without underline or markup.',
          intendedTargetOrCorrection: fix,
          solveNoteSnippet: solve.slice(0, 200)
        });
      }
    }

    // 2. Fill-in-the-blank specific glitches
    // Glitch A: Dash glued directly between two words without space (e.g. He–to, not- to, blown-by)
    const gluedMatch = text.match(/\b([a-zA-Z]+)[-–—]+([a-zA-Z]+)\b/);
    const isGluedHyphenWord = gluedMatch && !/\b(well|self|non|anti|post|mid|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|co|good|half|cul|de|sac|one|oft)\b/i.test(gluedMatch[1]);
    
    if (gluedMatch && isGluedHyphenWord) {
      findingsByExam[exam.slug].push({
        qNum: q.question_number,
        questionText: text,
        options: opts,
        correctAnswer: q.correct_answer,
        issueCategory: 'Malformed Blank (Dash Glued to Words)',
        issueDetail: `Blank gap dash is glued directly between words ("${gluedMatch[0]}") without spaces.`,
        intendedTargetOrCorrection: `Replace "${gluedMatch[0]}" with "${gluedMatch[1]} _____ ${gluedMatch[2]}".`,
        solveNoteSnippet: solve.slice(0, 200)
      });
    }

    // Glitch B: Fill in the blank mentioned, but uses raw multi-dashes or hyphens instead of standard blank
    if (/\b(fill in the blank|insert in the blank|suitable preposition for the blank|appropriate preposition for the blank|blank space)\b/i.test(text)) {
      const hasBlankMarker = /_{2,}|\.{3,}/.test(text);
      if (!hasBlankMarker) {
        const dashPresent = /[-–—]{1,}/.test(text);
        findingsByExam[exam.slug].push({
          qNum: q.question_number,
          questionText: text,
          options: opts,
          correctAnswer: q.correct_answer,
          issueCategory: dashPresent ? 'Non-standard Dash Used as Blank' : 'Missing Blank Indicator (____)',
          issueDetail: dashPresent 
            ? 'Question uses raw hyphen/en-dash as the blank indicator instead of clean underscore line "______".'
            : 'Question asks to fill in the blank, but no blank indicator or underscore is present in the sentence.',
          intendedTargetOrCorrection: 'Standardize the gap into a clear "_____" placeholder.',
          solveNoteSnippet: solve.slice(0, 200)
        });
      }
    }

    // 3. Duplicate options
    const optValues = rawOpts.map(v => (v || '').trim().toLowerCase()).filter(v => v.length > 0);
    const uniqueOpts = new Set(optValues);
    if (optValues.length === 4 && uniqueOpts.size < 4) {
      const duplicates: string[] = [];
      const seen = new Set<string>();
      for (const v of optValues) {
        if (seen.has(v) && !duplicates.includes(v)) duplicates.push(v);
        seen.add(v);
      }
      findingsByExam[exam.slug].push({
        qNum: q.question_number,
        questionText: text,
        options: opts,
        correctAnswer: q.correct_answer,
        issueCategory: 'Duplicate Options',
        issueDetail: `Two or more options have identical text: "${duplicates.join('", "')}".`,
        intendedTargetOrCorrection: 'Replace duplicate option with authentic alternative from original question paper.',
        solveNoteSnippet: solve.slice(0, 200)
      });
    }

    // 4. Missing correct answer in source
    if (!q.correct_answer || q.correct_answer.trim() === '') {
      findingsByExam[exam.slug].push({
        qNum: q.question_number,
        questionText: text,
        options: opts,
        correctAnswer: '(BLANK)',
        issueCategory: 'Defective Source (No Correct Answer)',
        issueDetail: 'Source dataset has an empty correct_answer field (known 8 defective BCS questions).',
        intendedTargetOrCorrection: 'Retain as blank / defective per dataset authority or provide PSC cancelled answer note.',
        solveNoteSnippet: solve.slice(0, 200)
      });
    }
  }
}

// Generate Markdown report
let md = `# BCS English Subject Analysis & Error Audit Report

> **Dataset Scope:** 10th to 50th BCS Preliminary Question Bank (41 Exams)  
> **Target Subject:** English (\`subject_id: 2\`, 977 Total Questions)  
> **Authority Source:** \`dataset/bcs_preliminary_question_bank.json\`  
> **Purpose:** Comprehensive exam-by-exam identification of formatting errors, missing underlines/highlights, missing/malformed blank indicators, duplicate options, and source discrepancies.

---

## 📊 Summary of Findings

| Metric | Count |
|---|---|
| **Total BCS Exams Analyzed** | 41 Exams (10th–50th BCS) |
| **Total English Questions** | 977 questions |
| **Exams with Identified Flaws/Discrepancies** | ${Object.values(findingsByExam).filter(f => f.length > 0).length} exams |
| **Missing Underline / Target Highlighting** | ${Object.values(findingsByExam).flat().filter(f => f.issueCategory === 'Missing Underline / Target Highlighting').length} questions |
| **Fill-in-the-Blank Missing or Malformed Gaps** | ${Object.values(findingsByExam).flat().filter(f => f.issueCategory.includes('Blank')).length} questions |
| **Duplicate / Corrupted Options** | ${Object.values(findingsByExam).flat().filter(f => f.issueCategory === 'Duplicate Options').length} questions |
| **Defective Answers (Blank in Source)** | ${Object.values(findingsByExam).flat().filter(f => f.issueCategory === 'Defective Source (No Correct Answer)').length} questions |

---

## 🔍 Key Error Categories Explained

### 1. Missing Underline / Target Highlighting (\`MISSING_UNDERLINE_FORMATTING\`)
- Questions ask *"What part of speech is the underlined word?"* or *"The underlined clause is..."*, but the question string was stripped of markup during extraction.
- **Example:** **48th BCS (Q34)**: \`She works hard. What part of speech is the underlined word?\` → The target word was **\`hard\`**.
- **Extraction Artifact:** In 46th BCS (Q43, Q44, Q47, Q50), the scraper left trailing underscores attached to words (e.g. \`following_\`, \`Writing a diary_\`, \`went back_\`) instead of applying proper formatting.

### 2. Fill-in-the-Blank Glitches & Missing/Malformed Gaps (\`BLANK_GLITCHES\`)
- **A. Dash Glued to Words (No Space):**
  - **10th BCS (Q19):** \`‘He–to see us if he had been able to.’\` → The dash was typed directly between \`He\` and \`to\` without spaces (\`He _____ to see us...\`).
  - **13th BCS (Q83):** \`English grammar is not- to understand.\` → Dash glued to \`not-\` (\`is not _____ to understand\`).
  - **26th BCS (Q72):** \`The lights have been blown-by the strong wind.\` → Dash glued to \`blown-by\` (\`blown _____ by\`).
  - **25th BCS (Q84):** \`The parents became extremely––––when their son...\` → Dashes glued to \`extremely\` and \`when\` (\`extremely _____ when\`).
- **B. Missing or Raw Dash Placeholder:**
  - Instructions say *"Fill in the blank with appropriate preposition/word"*, but the sentence uses raw non-standard en-dashes (\`––––\`, \`–\`, \`—\`) or lacks a clear underscore line (\`______\`).
  - **26th BCS (Q44):** \`I am looking forward ––– you.\` → Should be \`I am looking forward _____ you.\`
  - **26th BCS (Q47):** \`He is devoid –––– commonsense.\` → Should be \`He is devoid _____ commonsense.\`
  - **26th BCS (Q57):** \`––––– your shoes before entering...\` → Should be \`_____ your shoes before entering...\`
  - **34th BCS (Q35):** \`If I - a king!\` → Single minus sign \`-\` used instead of \`_____\`.
  - **43rd BCS (Q160):** \`‘She went to New Market ––’\` → Trailing en-dash \`––\`.

### 3. Duplicate / Overwritten Options (\`DUPLICATE_OPTIONS\`)
- Extraction or typo errors caused two options (e.g. Option A and Option C/D) to have identical strings.
- **44th BCS (Q69):** Option A and D both say \`authoratative\`.
- **44th BCS (Q72):** Option A and C both say \`Let not the door close.\`.
- **45th BCS (Q4):** Option C and D both say \`1 million year\`.

---

## 📅 Exam-by-Exam Analysis (10th BCS – 50th BCS)

`;

for (const exam of sortedExams) {
  const nMatch = exam.slug.match(/^(\d+)/);
  const n = nMatch ? nMatch[1] : exam.slug;
  const examTitle = `${n}th BCS (${exam.title})`;
  const findings = findingsByExam[exam.slug] || [];
  const engCount = questions.filter(q => q.exam_slug === exam.slug && q.subject_id === 2).length;

  md += `\n### 🎓 ${examTitle}\n`;
  md += `- **Slug:** \`${exam.slug}\` | **English Questions:** ${engCount} | **Issues Found:** ${findings.length}\n\n`;

  if (findings.length === 0) {
    md += `> ✅ **No formatting or structural errors detected in English section.**\n\n`;
    continue;
  }

  md += `| Q# | Issue Category | Question Text | Correct Ans | Diagnosis & Suggested Fix |\n`;
  md += `|:--:|:---|:---|:--:|:---|\n`;

  for (const f of findings) {
    const qClean = f.questionText.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const optsStr = `(A) ${f.options.A} (B) ${f.options.B} (C) ${f.options.C} (D) ${f.options.D}`.replace(/\|/g, '\\|');
    const fixClean = `${f.issueDetail} ${f.intendedTargetOrCorrection}`.replace(/\|/g, '\\|');
    md += `| **Q${f.qNum}** | \`${f.issueCategory}\` | "${qClean}"<br>*Options:* ${optsStr} | **${f.correctAnswer}** | ${fixClean} |\n`;
  }
  md += `\n`;
}

md += `\n---\n\n## 🛠️ Recommended Action Plan for App & UI Layer\n\n` +
`1. **Standardize Fill-in-the-Blank Placeholders:**\n` +
`   - Automatically replace glued dashes like \`He–to\`, \`not- to\`, \`blown-by\` with \`$1 _____ $2\` in question text parser.\n` +
`   - Transform raw dashes (\`––––\`, \`–––\`, \`---\`) used as blanks into standard \`_____\` lines.\n` +
`2. **Underline / Target Word Highlighting:**\n` +
`   - Map and format target words using \`<u>word</u>\` or \`**word**\` for all 31 underlined questions.\n` +
`3. **Trailing Underscore Cleaner (46th BCS):**\n` +
`   - Auto-clean words ending with trailing underscore (\`following_\` → \`<u>following</u>\`).\n` +
`4. **Option Deduplication:**\n` +
`   - Verify and patch duplicate options against PSC authentic past papers.\n`;

fs.writeFileSync('english_analysis.md', md);
console.log('Regenerated english_analysis.md with fill-in-the-blank findings!');
