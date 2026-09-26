/* Shared formatting + ground-truth constants (mirror ../assets/js/app.js) */

export const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toBn = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export const examNum = (slug: string): number => {
  const m = String(slug).match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};
export const examLabel = (slug: string): string => {
  const n = examNum(slug);
  return n ? `${toBn(n)}তম বিসিএস` : slug;
};
export const examMinutes = (totalMarks: number | null, qLen: number): number =>
  Math.max(10, Math.round((totalMarks || qLen || 100) * 0.6));

/** 36 seconds per question in whole minutes: Math.round((count * 36) / 60) */
export const calc36sMinutes = (count: number): number =>
  Math.max(1, Math.round((count * 36) / 60));

/** Format minutes into clean Bengali duration: e.g. "১২০ মিনিট (২ ঘণ্টা)", "৭২ মিনিট (১ ঘণ্টা ১২ মি.)", "৩৬ মিনিট" */
export const formatDurationBn = (mins: number): string => {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hourPart = `${toBn(h)} ঘণ্টা`;
    const minPart = m > 0 ? ` ${toBn(m)} মি.` : '';
    return `${toBn(mins)} মিনিট (${hourPart}${minPart})`;
  }
  return `${toBn(mins)} মিনিট`;
};

export const optText = (q: QuestionRow, k: string): string =>
  (q as unknown as Record<string, string>)['option_' + k.toLowerCase()] ?? '';

export const fmtTime = (s: number): string => {
  const t = Math.max(0, s);
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
};

const BN_MONTHS = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

/** Format timestamp into human-readable Bengali date & time (e.g. "আজ, ৬:৪৮ AM", "২৩ সেপ্টে, ৬:৪৮ AM", "১০ মিনিট আগে") */
export const formatDateTimeBn = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 1) return 'এইমাত্র';
  if (diffMin < 60) return `${toBn(diffMin)} মিনিট আগে`;

  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${toBn(hours)}:${toBn(mins)} ${ampm}`;

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return `আজ, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `গতকাল, ${timeStr}`;

  const day = toBn(d.getDate());
  const month = BN_MONTHS[d.getMonth()];
  return `${day} ${month}, ${timeStr}`;
};

/* Ground truth from dataset_manifest.json (static) */
export const SUBJECT_COUNT: Record<number, number> = {
  1: 1008, 2: 977, 3: 831, 4: 747, 5: 165,
  6: 517, 7: 201, 8: 564, 9: 214, 10: 126,
};

export const ERAS = [
  { label: 'সাম্প্রতিক', from: 46, to: 50 },
  { label: '৪০-এর দশক', from: 41, to: 45 },
  { label: '৩০-এর দশক', from: 31, to: 40 },
  { label: '২০-এর দশক', from: 21, to: 30 },
  { label: 'শুরুর দিকের', from: 10, to: 20 },
];

/* Random sampling + range helpers for custom practice/mock */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function slugForNum(n: number, exams: { slug: string }[]): string {
  const e = exams.find((x) => examNum(x.slug) === n);
  return e ? e.slug : '';
}

/** All exam slugs with numeric id in [fromN, toN], ascending. */
export function slugsInRange(fromN: number, toN: number, exams: { slug: string }[]): string[] {
  const lo = Math.min(fromN, toN);
  const hi = Math.max(fromN, toN);
  return exams
    .filter((e) => {
      const n = examNum(e.slug);
      return n >= lo && n <= hi;
    })
    .sort((a, b) => examNum(a.slug) - examNum(b.slug))
    .map((e) => e.slug);
}

export const COUNT_PRESETS = [10, 20, 30, 50, 100, 200];
export const TIME_PRESETS = [30, 60, 90, 120];

export interface Subject {
  id: number;
  subject_bn: string;
  subject_en: string;
}

export interface Exam {
  slug: string;
  title: string;
  total_marks: number;
  total_questions: number;
}

export interface QuestionRow {
  id: number;
  exam_slug: string;
  question_number: number;
  subject_id: number;
  subject_bn: string;
  subject_en: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string | null;
  solve_note: string;
  has_image: boolean;
  question_image_urls: string[];
  solve_note_image_urls: string[];
}
