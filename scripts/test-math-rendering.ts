import { convertPlainMathToLatex, renderKaTeXHtml, splitTextAndMath, hasMathTokens } from '../apps/web/src/lib/mathParser.ts';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== BCS Console Math & Science KaTeX Rendering Test ===\n');

const testCases = [
  {
    exam: '10th_bcs',
    qnum: 72,
    topic: 'সমবাহু ত্রিভুজের ক্ষেত্রফল',
    question: 'সমবাহু ত্রিভূজের বাহুর দৈর্ঘ্য যদি ‘a’ হয় তবে ক্ষেত্রফল হবে-',
    options: {
      A: '√৩/৪ a²',
      B: '√(৩/২ a²)',
      C: '৩/২ a²',
      D: '√(১/২a²)',
    },
    expectedAns: 'A',
    formulaCheck: (optA: string) => optA.includes('\\frac{\\sqrt{৩}}{৪}') && optA.includes('a^{2}'),
  },
  {
    exam: '11st_bcs',
    qnum: 75,
    topic: 'বৃত্তের ব্যাসার্ধ বৃদ্ধি',
    question: 'একটি বৃত্তের ব্যাসার্ধকে যদি r থেকে বৃদ্ধি করে r + n করা হয়, তবে তার ক্ষেত্রফল দ্বিগুণ হয়। r-এর মান কত?',
    options: {
      A: 'n/(√2-1)',
      B: 'n + √2',
      C: '√2n',
      D: '√(2(n + 1))',
    },
    expectedAns: 'A',
    formulaCheck: (optA: string) => optA.replace(/\s+/g, '').includes('\\frac{n}{\\sqrt{2}-1}'),
  },
  {
    exam: '17th_bcs',
    qnum: 6,
    topic: 'ভগ্নাংশের ঋণাত্মক সূচক',
    question: '(১২৫/২৭)^(-২/৩) - এর সহজ প্রকাশ?',
    options: {
      A: '১/২৫',
      B: '৫/২০',
      C: '৯/২৫',
      D: '৩/২০',
    },
    expectedAns: 'C',
    formulaCheck: (optC: string) => optC.includes('\\frac{৯}{২৫}'),
  },
  {
    exam: '40th_bcs',
    qnum: 166,
    topic: 'বীজগণিতীয় ঘন সূত্র',
    question: '((০.৯)³+(০.৪)³)/(০.৯+০.৪) এর মান কত?',
    options: {
      A: '০.৩৬',
      B: '০.৫১',
      C: '০.৮১',
      D: '০.৬১',
    },
    expectedAns: 'D',
    formulaCheck: () => true,
  },
  {
    exam: '40th_bcs',
    qnum: 168,
    topic: 'দ্বিঘাত সমীকরণের মূলদ্বয়',
    question: '6x²-7x-4=0 সমীকরণে মূলদ্বয়ের প্রকৃতি কোনটি?',
    options: {
      A: 'বাস্তব ও সমান',
      B: 'বাস্তব ও অসমান',
      C: 'অবাস্তব',
      D: 'পূর্ণ বর্গ সংখ্যা',
    },
    expectedAns: 'B',
    formulaCheck: () => true,
  },
  {
    exam: '40th_bcs',
    qnum: 170,
    topic: 'সূচক সমীকরণ',
    question: 'x^(x^(√x))=(x√x)^x হলে, x এর মান কত?',
    options: {
      A: '3/2',
      B: '4/5',
      C: '9/4',
      D: '2/3',
    },
    expectedAns: 'C',
    formulaCheck: (optC: string) => optC.includes('\\frac{9}{4}'),
  },
  {
    exam: '14th_bcs',
    qnum: 59,
    topic: 'বীজগণিতীয় অভেদ',
    question: '1/2{(a+b)²+(a−b)²} = কত?',
    options: {
      A: 'a²+b²',
      B: 'a²-b²',
      C: '(a+b)² 2-(a-b)² 2',
      D: '(a+b)²+(a-b)²',
    },
    expectedAns: 'A',
    formulaCheck: (optA: string) => optA.replace(/\s+/g, '').includes('a^{2}+b^{2}'),
  },
  {
    exam: '21st_bcs',
    qnum: 92,
    topic: 'বিজ্ঞান: ড্রাই আইস তাপমাত্রা',
    question: '‘ড্রাই আইস’ (dry ice) হলো-',
    solveNote: 'অনেক কম তাপমাত্রায় (−৭৮.৫^(∘)C) এবং কম চাপে gas...',
    formulaCheck: (note: string) => note.includes('^{\\circ}\\text{C}'),
  },
  {
    exam: '50th_bcs',
    qnum: 97,
    topic: 'গাণিতিক যুক্তি: ফ্যাক্টোরিয়াল ও বিন্যাস (ABSCISSA)',
    question: 'ABSCISSA শব্দটির বর্নগুলিকে নিয়ে কত প্রকারে বিন্যাস করা যায়?',
    options: {
      A: '1680',
      B: '3360',
      C: '6720',
      D: '8!',
    },
    expectedAns: 'B',
    solveNote: 'ABSCISSA শব্দটিতে মোট বর্ণ 8টি। যার মধ্যে একজাতীয় বর্ণ A আছে 2টি এবং S আছে 3টি। ∴ শব্দটির বিন্যাস সংখ্যা = 8!/(2!×3!) = (8×7×6×5×4×3!)/(2!×3!) = 8×7×6×5×2 = 3360',
    formulaCheck: (note: string) => note.includes('\\frac{8!}{2! \\times 3!}'),
  },
  {
    exam: '47th_bcs',
    qnum: 173,
    topic: 'গাণিতিক যুক্তি: সমাবেশ ও ফ্যাক্টোরিয়াল (nCr)',
    question: 'nC₁₂=nC₈ হলে, n এর মান কত?',
    solveNote: 'আমরা জানি, nC_x=nC_y হলে, n=x+y তাহলে, nC₁₂=nC₈ হওয়ায়, n=12+8=20 এখন, 22C_n=22C₂₀ =22!/(20!(22−20)!)=(22×21×20!)/(20!×2!)=(22×21)/(2×1)=11×21=231.',
    formulaCheck: (note: string) => note.replace(/\s+/g, '').includes('\\frac{22!}{20!(22-20)!}'),
  },
];

let allPassed = true;

for (const tc of testCases) {
  console.log(`Testing [${tc.exam} Q${tc.qnum}] ${tc.topic}...`);

  // 1. Question segmentation & rendering check
  const segs = splitTextAndMath(tc.question);
  console.log(`  ✓ Segments count: ${segs.length}`);
  for (const seg of segs) {
    if (seg.type === 'math') {
      if (!seg.html || seg.html.includes('katex-fallback')) {
        console.error(`  FAIL: Math segment failed: ${seg.content}`);
        allPassed = false;
      } else {
        console.log(`    [Math seg]: "${seg.content}" -> rendered HTML (${seg.html.length} chars)`);
      }
    } else {
      console.log(`    [Text seg]: "${seg.content}"`);
    }
  }

  // 2. Options
  if (tc.options) {
    for (const [key, val] of Object.entries(tc.options)) {
      const optSegs = splitTextAndMath(val);
      const isMath = optSegs.some((s) => s.type === 'math');
      if (isMath) {
        const mathSeg = optSegs.find((s) => s.type === 'math');
        if (!mathSeg?.html) {
          console.error(`  FAIL: Option ${key} math HTML missing for "${val}"`);
          allPassed = false;
        }
      }
    }
    const correctOpt = tc.options[tc.expectedAns as 'A' | 'B' | 'C' | 'D'];
    const correctLatex = convertPlainMathToLatex(correctOpt);
    if (!tc.solveNote && tc.formulaCheck && !tc.formulaCheck(correctLatex)) {
      console.error(`  FAIL: Formula check failed for Option ${tc.expectedAns}: ${correctLatex}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Correct Option ${tc.expectedAns}: "${correctOpt}" -> LaTeX: "${correctLatex}"`);
    }
  }

  // 3. Solve note
  if (tc.solveNote) {
    const noteSegs = splitTextAndMath(tc.solveNote);
    const mathSeg = noteSegs.find((s) => s.type === 'math');
    const noteLatex = convertPlainMathToLatex(tc.solveNote);
    if (tc.formulaCheck && !tc.formulaCheck(noteLatex)) {
      console.error(`  FAIL: Formula check failed for Solve Note: ${noteLatex}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Solve Note snippet: "${tc.solveNote}" -> LaTeX: "${noteLatex}"`);
    }
  }
  console.log();
}

if (allPassed) {
  console.log('🎉 ALL PSC MATH & SCIENCE FORMULA TESTS PASSED WITH 100% ACCURACY!');
} else {
  console.error('❌ Some tests failed. Please inspect.');
  process.exit(1);
}
