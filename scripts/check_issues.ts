import { convertPlainMathToLatex, splitTextAndMath, renderKaTeXHtml } from '../apps/web/src/lib/mathParser';

const q48 = '(x²−2+1/x²)⁷ এর বিস্তৃতিতে মধ্যপদ কততম পদটি?';
console.log('=== Q48 ===');
console.log('Raw:', q48);
const segs48 = splitTextAndMath(q48);
for (const s of segs48) {
  console.log(`[${s.type}]:`, s.content);
  if (s.html) console.log('Latex:', convertPlainMathToLatex(s.content));
}

const q24 = '−1+1/2−1/4+1/8−1/16+ অসীম ধারাটির যোগফল হবে:';
console.log('\n=== Q24 ===');
console.log('Raw:', q24);
const segs24 = splitTextAndMath(q24);
for (const s of segs24) {
  console.log(`[${s.type}]:`, s.content);
  if (s.html) console.log('Latex:', convertPlainMathToLatex(s.content));
}

const optA24 = '−2/3';
console.log('\n=== Q24 Opt A ===');
console.log('Raw:', optA24);
console.log('Latex:', convertPlainMathToLatex(optA24));
