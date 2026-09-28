import { Link, router } from 'expo-router';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Brain,
  Calculator,
  CheckCircle2,
  Cpu,
  Download,
  Earth,
  FlaskConical,
  Globe,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Landmark,
  Layers,
  Scale,
  SlidersHorizontal,
  Timer,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { Bn, Btn, SectionHead } from '../components/ui';
import { AnimatedStatNumber } from '../components/animated-number';
import { PreparationGuideSection } from '../components/preparation-guide';
import { useBankStats, useSubjects } from '../hooks/queries';
import { FONT } from '../lib/fonts';
import { SUBJECT_COUNT, toBn, type Subject } from '../lib/format';
import { ANDROID_APP_VERSION, ANDROID_APK_URL } from '../lib/download';

const TAXONOMY_SUBJECTS: Subject[] = [
  { id: 1, subject_bn: 'বাংলা ভাষা ও সাহিত্য', subject_en: 'Bangla Language & Literature' },
  { id: 2, subject_bn: 'English Language & Literature', subject_en: 'English Language & Literature' },
  { id: 3, subject_bn: 'বাংলাদেশ বিষয়াবলি', subject_en: 'Bangladesh Affairs' },
  { id: 4, subject_bn: 'আন্তর্জাতিক বিষয়াবলি', subject_en: 'International Affairs' },
  { id: 5, subject_bn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', subject_en: 'Geography & Environment' },
  { id: 6, subject_bn: 'সাধারণ বিজ্ঞান', subject_en: 'General Science' },
  { id: 7, subject_bn: 'কম্পিউটার ও তথ্যপ্রযুক্তি', subject_en: 'Computer & IT' },
  { id: 8, subject_bn: 'গাণিতিক যুক্তি', subject_en: 'Mathematical Reasoning' },
  { id: 9, subject_bn: 'মানসিক দক্ষতা', subject_en: 'Mental Ability' },
  { id: 10, subject_bn: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', subject_en: 'Ethics & Good Governance' },
];

export const SUBJECT_ICONS: Record<number, LucideIcon> = {
  1: BookOpenText,
  2: BookOpenText,
  3: Landmark,
  4: Globe,
  5: Earth,
  6: FlaskConical,
  7: Cpu,
  8: Calculator,
  9: Brain,
  10: Scale,
};

const RULES: { id: string; subject: string; rule: string }[] = [
  { id: '০১', subject: 'নম্বর', rule: 'সঠিক উত্তরে +১.০০, ভুল উত্তরে −০.৫০' },
  { id: '০২', subject: 'উত্তর না দিলে', rule: 'কোনো নম্বর কাটা হবে না' },
  { id: '০৩', subject: 'সময়', rule: 'মোট ১২০ মিনিট · সময় শেষে স্বয়ংক্রিয় জমা' },
];

export default function Home() {
  const { width } = useWindowDimensions();
  const { data: subjects } = useSubjects();
  const { data: stats } = useBankStats();

  const displaySubjects = subjects && subjects.length > 0 ? subjects : TAXONOMY_SUBJECTS;

  /* Compute column counts and pixel-perfect responsive widths for uniform grids */
  const statCols = width >= 768 ? 4 : 2;
  const statGap = width > 600 ? 12 : 10;
  const statCardWidth =
    statCols === 4
      ? `calc(25% - ${(3 * statGap) / 4}px)`
      : `calc(50% - ${statGap / 2}px)`;

  const subjectCols = width > 1000 ? 5 : width > 750 ? 4 : width > 500 ? 3 : 2;
  const subjectGap = 12;
  const subjectCardWidth = `calc(${100 / subjectCols}% - ${((subjectCols - 1) * subjectGap) / subjectCols}px)`;

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1100px] px-5 py-12">
        {/* Hero Section - Centered with commanding typography & calligraphy */}
        <View className="relative items-center overflow-hidden pb-10 pt-2 md:pb-16 md:pt-6">

          {/* Subtitle kicker pill with flanking decorative flourish lines */}
          <View className="mb-6 flex-row items-center justify-center gap-3">
            <View className="h-[1px] w-10 sm:w-16 md:w-24 bg-gradient-to-r from-transparent to-black/20" />
            <View className="flex-row items-center gap-2 rounded-full border border-black/10 bg-surface px-4 py-1.5 shadow-xs">
              <View className="h-2 w-2 rounded-full bg-[#EA0000]" />
              <Text
                className="text-black/75"
                style={{ fontFamily: FONT.uiSemi, fontSize: width > 600 ? 13 : 12, letterSpacing: 0.3 }}>
                প্রিলিমিনারি • বাংলাদেশ সিভিল সার্ভিস • প্রশ্নব্যাংক
              </Text>
            </View>
            <View className="h-[1px] w-10 sm:w-16 md:w-24 bg-gradient-to-l from-transparent to-black/20" />
          </View>

          {/* Hero Title - Grand Display Typography */}
          <View className="items-center">
            <Text
              style={{
                fontFamily: FONT.displayBlack,
                fontSize: width > 900 ? 58 : width > 650 ? 46 : 32,
                lineHeight: width > 900 ? 76 : width > 650 ? 62 : 44,
                textAlign: 'center',
                maxWidth: 900,
              }}>
              <Bn>{'১০ম থেকে ৫০তম —\nআসল প্রশ্নে '}</Bn>
              <Text style={{ color: '#EA0000', fontFamily: FONT.displayBlack }}>আসল প্রস্তুতি</Text>
            </Text>

            {/* Calligraphic Brush Flourish Accent under 'আসল প্রস্তুতি' */}
            <View className="mt-1 items-center">
              <Svg width={width > 700 ? 240 : 160} height={14} viewBox="0 0 240 14" fill="none">
                <Path
                  d="M4 10C55 2 170 2 236 8C175 13 65 13 4 10Z"
                  fill="#EA0000"
                />
              </Svg>
            </View>
          </View>

          {/* Description - Expanded reading width */}
          <Text
            className="text-black/70"
            style={{
              fontFamily: FONT.ui,
              fontSize: width > 700 ? 17.5 : 15,
              lineHeight: width > 700 ? 30 : 25,
              textAlign: 'center',
              maxWidth: 720,
              marginTop: 18,
              marginBottom: 32,
            }}>
            বছরভিত্তিক বিগত প্রশ্নে অনুশীলন করুন, বিষয় ধরে ধরে দুর্বলতা কাটান, আর ঘড়ি ধরে পূর্ণাঙ্গ মক এক্সাম দিন।
          </Text>

          {/* Hero Actions — one shared pill, 3 divided segments (icon over label
              so it fits narrow phones and desktop alike). */}
          <View className="w-full max-w-[560px] flex-row items-stretch self-center overflow-hidden rounded-2xl border border-black/10 bg-surface shadow-sm transition-all duration-300 hover:border-black/20 hover:shadow-md">
            <Link href={"/practice" as any} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="অনুশীলন শুরু"
                className="group min-h-[68px] flex-1 items-center justify-center gap-1.5 px-3 py-3.5 transition-all duration-200 hover:bg-[#EA0000]/[0.06] active:bg-[#EA0000]/[0.12]">
                <View className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
                  <BookOpen size={20} color="#EA0000" />
                </View>
                <Text className="text-center text-black transition-colors duration-200 group-hover:text-[#EA0000]" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                  অনুশীলন শুরু
                </Text>
              </Pressable>
            </Link>
            <View className="my-3 w-px bg-black/10" />
            <Link href="/exam" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="মক এক্সাম"
                className="group min-h-[68px] flex-1 items-center justify-center gap-1.5 px-3 py-3.5 transition-all duration-200 hover:bg-black/[0.04] active:bg-black/[0.08]">
                <View className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
                  <Timer size={20} color="#0A0A0A" />
                </View>
                <Text className="text-center text-black/80 transition-colors duration-200 group-hover:text-black" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                  মক এক্সাম
                </Text>
              </Pressable>
            </Link>
            <View className="my-3 w-px bg-black/10" />
            <Link href="/custom" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="কাস্টম এক্সাম"
                className="group min-h-[68px] flex-1 items-center justify-center gap-1.5 px-3 py-3.5 transition-all duration-200 hover:bg-black/[0.04] active:bg-black/[0.08]">
                <View className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
                  <SlidersHorizontal size={20} color="#0A0A0A" />
                </View>
                <Text className="text-center text-black/80 transition-colors duration-200 group-hover:text-black" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                  কাস্টম এক্সাম
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Stat Cards Banner — uniform 4-col on desktop, 2x2 on mobile */}
        <View className="mb-14">
          <View className="flex-row flex-wrap" style={{ gap: statGap }}>
            {[
              {
                label: 'মোট পরীক্ষা',
                num: stats?.exams ?? 41,
                icon: GraduationCap,
                sub: '১০ম–৫০তম বিসিএস',
                delay: 0,
              },
              {
                label: 'মোট প্রশ্ন',
                num: stats?.questions ?? 5350,
                hasComma: true,
                icon: HelpCircle,
                sub: 'যাচাইকৃত প্রশ্নসম্ভার',
                delay: 120,
              },
              {
                label: 'বিষয়',
                num: displaySubjects.length || 10,
                icon: Layers,
                sub: 'স্থায়ী সিলেবাস কাঠামো',
                delay: 240,
              },
              {
                label: 'ছবিসহ প্রশ্ন',
                num: stats?.withImages ?? 766,
                icon: ImageIcon,
                sub: 'ডায়াগ্রাম ও চিত্রব্যাখ্যা',
                delay: 360,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <View
                  key={stat.label}
                  style={
                    {
                      width: statCardWidth,
                      minHeight: width > 600 ? 130 : 118,
                    } as any
                  }
                  className="group justify-between rounded-xl sm:rounded-2xl border border-black/10 bg-surface p-3.5 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-black/25 hover:shadow-md">
                  <View className="mb-2 sm:mb-3 flex-row items-center justify-between">
                    <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: width > 600 ? 13 : 11.5 }}>
                      {stat.label}
                    </Text>
                    <View className="h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-black/[0.04] transition-colors group-hover:bg-black/[0.08]">
                      <Icon size={width > 600 ? 16 : 14} color="#0A0A0A" />
                    </View>
                  </View>
                  <AnimatedStatNumber
                    value={stat.num}
                    delay={stat.delay}
                    hasComma={stat.hasComma}
                    fontSize={width > 600 ? 28 : 22}
                    lineHeight={width > 600 ? 34 : 28}
                  />
                  <Text className="text-black/45" style={{ fontFamily: FONT.ui, fontSize: width > 600 ? 11 : 10.5, marginTop: 4 }}>
                    {stat.sub}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Section 2: 10 Subject Cards — uniform grid */}
        <SectionHead
          kicker="বিষয়ভিত্তিক বিন্যাস"
          title="দশটি বিষয়"
          desc="সরাসরি অনুশীলন করুন"
        />
        <View className="mb-14">
          <View className="flex-row flex-wrap" style={{ gap: subjectGap }}>
            {displaySubjects.map((s) => {
              const Icon = SUBJECT_ICONS[s.id] ?? BookOpen;
              const qCount = SUBJECT_COUNT[s.id] ?? 0;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/practice/subject/${s.id}` as any)}
                  style={{ width: subjectCardWidth, height: 165 } as any}
                  className="justify-between rounded-2xl border border-black/10 bg-surface p-5 shadow-sm transition-all hover:border-black/30 hover:shadow-md active:bg-black/[0.02]">
                  <View>
                    <View className="mb-3 flex-row items-center justify-between">
                      <View className="min-w-[32px] h-7 px-2 items-center justify-center rounded-full bg-black/[0.05]">
                        <Text style={{ fontFamily: FONT.digitsBold, fontSize: 11.5, color: '#0A0A0A', includeFontPadding: false }}>
                          {toBn(String(s.id).padStart(2, '0'))}
                        </Text>
                      </View>
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-black/[0.03]">
                        <Icon size={15} color="#0A0A0A" />
                      </View>
                    </View>
                    <Text style={{ fontFamily: FONT.display, fontSize: 15, lineHeight: 22, marginBottom: 2 }} numberOfLines={2}>
                      {s.subject_bn}
                    </Text>
                    <Text className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 11 }} numberOfLines={1}>
                      {s.subject_en}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between border-t border-black/5 pt-2">
                    <Text style={{ fontFamily: FONT.displayBlack, fontSize: 15.5, color: '#0A0A0A' }}>
                      {`${toBn(qCount.toLocaleString('en-US'))}টি`}
                    </Text>
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-black/[0.04]">
                      <ArrowRight size={13} color="#0A0A0A" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 3: Redesigned 3-Step Preparation Guide */}
        <PreparationGuideSection />

        {/* Section 5: Rules Card */}
        <SectionHead
          kicker="পরীক্ষার নিয়ম"
          title="শুরু করার আগে গুরুত্বপূর্ণ বিষয়গুলো জেনে নিন"
        />
        <View className="mb-14 overflow-hidden rounded-2xl bg-surface p-6 shadow-sm">
          {/* Table Header */}
          <View className="mb-3 flex-row items-center px-4 py-2">
            <View className="w-16">
              <Text className="text-black/45" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                ক্রম
              </Text>
            </View>
            <View className="w-36">
              <Text className="text-black/45" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                বিষয়
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-black/45" style={{ fontFamily: FONT.uiSemi, fontSize: 13 }}>
                নিয়ম
              </Text>
            </View>
          </View>

          {/* Table Rows (No borders) */}
          <View className="gap-1">
            {RULES.map((r, idx) => (
              <View
                key={r.id}
                className={`flex-row items-center rounded-xl px-4 py-3.5 ${
                  idx % 2 === 0 ? 'bg-black/[0.02]' : 'bg-transparent'
                }`}>
                <View className="w-16">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-black/[0.05]">
                    <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: '#0A0A0A' }}>
                      {r.id}
                    </Bn>
                  </View>
                </View>
                <View className="w-36 pr-3">
                  <Bn className="text-black/85" style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>
                    {r.subject}
                  </Bn>
                </View>
                <View className="flex-1">
                  <Bn className="text-black/75" style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22 }}>
                    {r.rule}
                  </Bn>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Download the mobile app */}
        <View className="mb-6 items-center rounded-2xl border border-black/10 bg-ink p-8 text-center shadow-sm">
          <Download size={26} color="#FFFFFF" />
          <Text
            className="text-center text-white"
            style={{ fontFamily: FONT.displayBlack, fontSize: 22, marginTop: 12, marginBottom: 6 }}>
            Download the mobile app
          </Text>
          <Text
            className="text-center text-white/65"
            style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 22, maxWidth: 460 }}>
            {`অ্যান্ড্রয়েড APK (${ANDROID_APP_VERSION}) — সরাসরি ফোনে ইনস্টল করুন, offline-এও অনুশীলন সুবিধা।`}
          </Text>
          <Link
            href={ANDROID_APK_URL as any}
            accessibilityRole="button"
            accessibilityLabel="download the mobile app"
            {...({ title: 'download the mobile app' } as any)}
            className="mt-5 flex-row items-center gap-2 rounded-xl bg-white px-6 py-3 transition-opacity active:opacity-90"
            style={{ minHeight: 48 } as any}>
            <Download size={17} color="#0A0A0A" />
            <Text className="text-black" style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>
              ডাউনলোড করুন
            </Text>
          </Link>
        </View>

        {/* Footer Brand Card */}
        <View className="items-center rounded-2xl border border-black/10 bg-surface p-8 text-center shadow-sm">
          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 24, marginBottom: 8 }}>
            বিসিএস<Text style={{ color: '#EA0000', fontFamily: FONT.displayBlack }}>·</Text>কনসোল
          </Text>
          <Text
            className="text-center text-black/55"
            style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 22, maxWidth: 460 }}>
            স্বাধীন অনুশীলন মাধ্যম। সরকারি কর্ম কমিশনের সঙ্গে সম্পর্কহীন। প্রশ্ন ও ছবি শিক্ষা/গবেষণা উদ্দেশ্যে সংগৃহীত ।
          </Text>
          <View className="mt-6">
            <Btn title="অনুশীলন শুরু করুন →" variant="dark" onPress={() => router.push('/practice' as any)} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
