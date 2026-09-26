const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// 1. Transpile and load normalizeQuestion from questionPatch.ts
const patchCode = fs.readFileSync(path.resolve(__dirname, '../apps/web/src/lib/questionPatch.ts'), 'utf8');
const js = ts.transpileModule(patchCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, (mod) => {
  if (mod === './format') return {};
  return require(mod);
});
const { normalizeQuestion } = m.exports;

// 2. Patch combined dataset: bcs_preliminary_question_bank.json
const combinedPath = path.resolve(__dirname, '../dataset/bcs_preliminary_question_bank.json');
console.log('Patching combined dataset:', combinedPath);
const combinedRaw = fs.readFileSync(combinedPath, 'utf8');
const combinedData = JSON.parse(combinedRaw);

let combinedPatchedCount = 0;
combinedData.questions = combinedData.questions.map((q) => {
  const patched = normalizeQuestion(q);
  if (
    patched.question !== q.question ||
    patched.option_a !== q.option_a ||
    patched.option_b !== q.option_b ||
    patched.option_c !== q.option_c ||
    patched.option_d !== q.option_d ||
    patched.solve_note !== q.solve_note
  ) {
    combinedPatchedCount++;
    console.log(`  Combined patched: ${q.exam_slug} Q#${q.question_number}`);
  }
  return patched;
});

console.log(`Combined dataset: ${combinedPatchedCount} questions patched.`);
fs.writeFileSync(combinedPath, JSON.stringify(combinedData, null, 2) + '\n', 'utf8');

// 3. Patch individual exam files: dataset/data/processed/json/*_bcs.json
const individualDir = path.resolve(__dirname, '../dataset/data/processed/json');
console.log('\nPatching individual exam files in:', individualDir);
const files = fs.readdirSync(individualDir).filter(f => f.endsWith('.json'));

let totalIndividualPatched = 0;
for (const file of files) {
  const filePath = path.join(individualDir, file);
  const examData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let fileChanged = false;
  examData.questions = examData.questions.map((q) => {
    const patched = normalizeQuestion(q);
    if (
      patched.question !== q.question ||
      patched.option_a !== q.option_a ||
      patched.option_b !== q.option_b ||
      patched.option_c !== q.option_c ||
      patched.option_d !== q.option_d ||
      patched.solve_note !== q.solve_note
    ) {
      fileChanged = true;
      totalIndividualPatched++;
      console.log(`  [${file}] patched: Q#${q.question_number}`);
    }
    return patched;
  });

  if (fileChanged) {
    fs.writeFileSync(filePath, JSON.stringify(examData, null, 2) + '\n', 'utf8');
  }
}

console.log(`\nIndividual files: ${totalIndividualPatched} questions patched across individual exam JSONs.`);

// 4. Verification assertions
console.log('\n=== Post-Patch Integrity Verification ===');
if (combinedData.questions.length !== 5350) {
  console.error(`ERROR: Combined question count mismatch: ${combinedData.questions.length} !== 5350`);
  process.exit(1);
}

// Check 8 defective blank answers are still blank
const blankAnsKeys = new Set([
  '25th_bcs:65', '26th_bcs:91', '34th_bcs:100', '36th_bcs:113',
  '36th_bcs:120', '38th_bcs:83', '39th_bcs:76', '47th_bcs:110'
]);

for (const q of combinedData.questions) {
  const key = `${q.exam_slug}:${q.question_number}`;
  if (blankAnsKeys.has(key)) {
    if (q.correct_answer !== '' && q.correct_answer !== null) {
      console.error(`ERROR: Blank answer row ${key} was altered: "${q.correct_answer}"`);
      process.exit(1);
    }
  }
}
console.log('✓ All 8 known defective answer rows remain blank.');

if (combinedPatchedCount === 48 && totalIndividualPatched === 48) {
  console.log('✓ EXACT MATCH: Exactly 48 questions patched in combined and individual files.');
  console.log('SUCCESS!');
} else {
  console.error(`Mismatch in patched counts: combined=${combinedPatchedCount}, individual=${totalIndividualPatched}`);
  process.exit(1);
}
