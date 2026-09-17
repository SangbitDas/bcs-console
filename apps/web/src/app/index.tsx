import { Link, router } from 'expo-router';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Brain,
  Calculator,
  CheckCircle2,
  Cpu,
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
import { useBankStats, useSubjects } from '../hooks/queries';
import { FONT } from '../lib/fonts';
import { SUBJECT_COUNT, toBn, type Subject } from '../lib/format';

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

  /* Compute column counts for uniform grids */
  const statCols = width > 900 ? 4 : 2;
  const subjectCols = width > 1000 ? 5 : width > 750 ? 4 : width > 500 ? 3 : 2;

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1100px] px-5 py-12">
        {/* Hero Section - Centered with commanding typography & calligraphy */}
        <View className="relative items-center overflow-hidden pb-10 pt-2 md:pb-16 md:pt-6">
          {/* Subtle watermarked numerals framing the empty side spaces */}
          <View
            style={{
              position: 'absolute',
              left: -10,
              top: 10,
              opacity: 0.035,
              pointerEvents: 'none',
            }}>
            <Text style={{ fontFamily: FONT.displayBlack, fontSize: width > 700 ? 160 : 90, userSelect: 'none' }}>
              ১০
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              right: -10,
              top: 10,
              opacity: 0.035,
              pointerEvents: 'none',
            }}>
            <Text style={{ fontFamily: FONT.displayBlack, fontSize: width > 700 ? 160 : 90, userSelect: 'none' }}>
              ৫০
            </Text>
          </View>

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

          {/* Hero Action Buttons */}
          <View className="flex-row flex-wrap justify-center gap-4">
            <Link href={"/practice" as any} asChild>
              <Pressable className="min-h-[50px] flex-row items-center gap-2.5 rounded-xl bg-ink px-8 shadow-sm transition-all hover:bg-black/90 active:scale-[0.98]">
                <BookOpen size={18} color="#fff" />
                <Text className="text-white" style={{ fontFamily: FONT.uiSemi, fontSize: 15.5 }}>
                  অনুশীলন শুরু
                </Text>
                <ArrowRight size={17} color="#fff" />
              </Pressable>
            </Link>
            <Link href="/exam" asChild>
              <Pressable className="min-h-[50px] flex-row items-center gap-2.5 rounded-xl border border-black/20 bg-surface px-8 shadow-sm transition-all hover:border-black/40 hover:bg-black/[0.02] active:scale-[0.98]">
                <Timer size={18} color="#0A0A0A" />
                <Text style={{ fontFamily: FONT.uiSemi, fontSize: 15.5 }}>মক এক্সাম</Text>
                <ArrowRight size={17} color="#0A0A0A" />
              </Pressable>
            </Link>
            <Link href="/custom" asChild>
              <Pressable className="min-h-[50px] flex-row items-center gap-2.5 rounded-xl border border-black/20 bg-surface px-8 shadow-sm transition-all hover:border-black/40 hover:bg-black/[0.02] active:scale-[0.98]">
                <SlidersHorizontal size={18} color="#0A0A0A" />
                <Text style={{ fontFamily: FONT.uiSemi, fontSize: 15.5 }}>কাস্টম এক্সাম</Text>
                <ArrowRight size={17} color="#0A0A0A" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Stat Cards Banner — uniform 4-col on desktop, 2x2 on mobile */}
        <View className="mb-14">
          <View className="flex-row flex-wrap" style={{ gap: width > 600 ? 12 : 10 }}>
            {[
              { label: 'মোট পরীক্ষা', val: `${toBn(stats?.exams ?? 41)}টি`, icon: GraduationCap, sub: '১০ম–৫০তম বিসিএস' },
              {
                label: 'মোট প্রশ্ন',
                val: `${toBn((stats?.questions ?? 5350).toLocaleString('en-US'))}টি`,
                icon: HelpCircle,
                sub: 'যাচাইকৃত প্রশ্নসম্ভার',
              },
              { label: 'বিষয়', val: `${toBn(displaySubjects.length)}টি`, icon: Layers, sub: 'স্থায়ী সিলেবাস কাঠামো' },
              {
                label: 'ছবিসহ প্রশ্ন',
                val: `${toBn(stats?.withImages ?? 766)}টি`,
                icon: ImageIcon,
                sub: 'ডায়াগ্রাম ও চিত্রব্যাখ্যা',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <View
                  key={stat.label}
                  style={
                    {
                      width: statCols === 4 ? 'calc(25% - 9px)' : 'calc(50% - 5px)',
                      minHeight: width > 600 ? 130 : 118,
                    } as any
                  }
                  className="justify-between rounded-xl sm:rounded-2xl border border-black/10 bg-surface p-3.5 sm:p-5 shadow-sm transition-all hover:border-black/20">
                  <View className="mb-2 sm:mb-3 flex-row items-center justify-between">
                    <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: width > 600 ? 13 : 11.5 }}>
                      {stat.label}
                    </Text>
                    <View className="h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-black/[0.04]">
                      <Icon size={width > 600 ? 16 : 14} color="#0A0A0A" />
                    </View>
                  </View>
                  <Bn bold style={{ fontFamily: FONT.displayBlack, fontSize: width > 600 ? 28 : 22, lineHeight: width > 600 ? 34 : 28 }}>
                    {stat.val}
                  </Bn>
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
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {displaySubjects.map((s) => {
              const Icon = SUBJECT_ICONS[s.id] ?? BookOpen;
              const qCount = SUBJECT_COUNT[s.id] ?? 0;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/practice/subject/${s.id}` as any)}
                  style={{ width: `${100 / subjectCols - 2}%`, height: 165 }}
                  className="justify-between rounded-2xl border border-black/10 bg-surface p-5 shadow-sm transition-all hover:border-black/30 hover:shadow-md active:bg-black/[0.02]">
                  <View>
                    <View className="mb-3 flex-row items-center justify-between">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-black/[0.05]">
                        <Text style={{ fontFamily: FONT.uiBold, fontSize: 11, color: '#0A0A0A' }}>
                          {String(s.id).padStart(2, '0')}
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
                    <Bn bold style={{ fontFamily: FONT.displayBlack, fontSize: 16 }}>
                      {`${toBn(qCount.toLocaleString('en-US'))}`}
                    </Bn>
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-black/[0.04]">
                      <ArrowRight size={13} color="#0A0A0A" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Unified Section: Preparation Modes */}
        <SectionHead kicker="কীভাবে প্রস্তুতি নেবেন" title="প্রস্তুতির তিনটি শক্তিশালী মাধ্যম।" />
        <View className="mb-14">
          <View className="flex-row flex-wrap" style={{ gap: 14 }}>
            {/* Practice Card */}
            <Pressable
              onPress={() => router.push('/practice' as any)}
              style={
                {
                  width: width > 990 ? 'calc(33.333% - 10px)' : width > 640 ? 'calc(50% - 7px)' : '100%',
                  minHeight: 320,
                } as any
              }
              className="justify-between rounded-2xl border border-black/10 bg-surface p-6 sm:p-7 shadow-sm transition-all hover:border-black/30 hover:shadow-md active:scale-[0.99]">
              <View>
                <View className="mb-5 flex-row items-center justify-between">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#EA0000]/10">
                    <BookOpen size={24} color="#EA0000" />
                  </View>
                  <View className="rounded-full bg-[#EA0000]/10 px-3 py-1">
                    <Text className="text-[#EA0000]" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                      ঘড়ি ছাড়া · সেলফ-লার্নিং
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-[#EA0000]"
                  style={{ fontFamily: FONT.uiSemi, fontSize: 11, marginBottom: 6 }}>
                  PRACTICE · স্বতঃস্ফূর্ত অনুশীলন
                </Text>
                <Text style={{ fontFamily: FONT.display, fontSize: 21, lineHeight: 29, marginBottom: 8 }}>
                  নিজের গতিতে প্রশ্ন সমাধান ও রিভিশন
                </Text>
                <Text
                  className="text-black/70"
                  style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                  ১০ম থেকে ৫০তম বিসিএস এবং ১০টি বিষয়ের যেকোনো সংমিশ্রণে নিজের মতো অনুশীলন করুন। কোনো সময়ের চাপ ছাড়া প্রতিটি উত্তরের পুঙ্খানুপুঙ্খ ব্যাখ্যা ও চিত্রসহ সঠিক সমাধান আয়ত্ত করুন।
                </Text>

                <View className="gap-2.5">
                  {[
                    '১০ম–৫০তম বিসিএস ও ১০টি বিষয়ের স্বাধীন ফিল্টারিং',
                    'তাৎক্ষণিক সঠিক-ভুল যাচাই, সমাধান নোট ও চিত্রব্যাখ্যা',
                    'বুকমার্ক সংরক্ষণ ও ভুলসমূহ আলাদা অনুশীলনের সুযোগ',
                  ].map((feat) => (
                    <View key={feat} className="flex-row items-center gap-2.5">
                      <CheckCircle2 size={15} color="#16a34a" />
                      <Text className="text-black/80 flex-1" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19 }}>
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-black/5 pt-4 mt-6">
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>অনুশীলন শুরু করুন</Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-ink">
                  <ArrowRight size={15} color="#fff" />
                </View>
              </View>
            </Pressable>

            {/* Mock Exam Card */}
            <Pressable
              onPress={() => router.push('/exam')}
              style={
                {
                  width: width > 990 ? 'calc(33.333% - 10px)' : width > 640 ? 'calc(50% - 7px)' : '100%',
                  minHeight: 320,
                } as any
              }
              className="justify-between rounded-2xl border border-black/10 bg-surface p-6 sm:p-7 shadow-sm transition-all hover:border-black/30 hover:shadow-md active:scale-[0.99]">
              <View>
                <View className="mb-5 flex-row items-center justify-between">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-black/[0.04]">
                    <Timer size={24} color="#0A0A0A" />
                  </View>
                  <View className="rounded-full bg-black/[0.04] px-3 py-1">
                    <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                      বাস্তব পরিবেশ · মূল্যায়ন
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-black/50"
                  style={{ fontFamily: FONT.uiSemi, fontSize: 11, marginBottom: 6 }}>
                  MOCK EXAM · পূর্ণাঙ্গ পরীক্ষা
                </Text>
                <Text style={{ fontFamily: FONT.display, fontSize: 21, lineHeight: 29, marginBottom: 8 }}>
                  পরীক্ষার হলের পরিবেশে রিয়েল-টাইম টেস্ট
                </Text>
                <Text
                  className="text-black/70"
                  style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                  আসল বিসিএস পরীক্ষার মতো নির্ধারিত সময়সীমা ও কড়া নেগেটিভ মার্কিংয়ের অধীনে পরীক্ষা দিন। পরীক্ষার হলের আবহাওয়ায় সময় ব্যবস্থাপনা ও বাস্তব প্রস্তুতি যাচাই করুন।
                </Text>

                <View className="gap-2.5">
                  {[
                    '১২০ মিনিটের কাউন্টডাউন টাইমার ও স্বয়ংক্রিয় ওএমআর জমা',
                    'ডিজিটাল ওএমআর শিট ও এক নজরে সম্পূর্ণ প্রশ্ন প্যালেট',
                    'ভুল উত্তরের জন্য −০.৫০ নেগেটিভ মার্কিং সহ নির্ভুল স্কোর বিশ্লেষণ',
                  ].map((feat) => (
                    <View key={feat} className="flex-row items-center gap-2.5">
                      <CheckCircle2 size={15} color="#16a34a" />
                      <Text className="text-black/80 flex-1" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19 }}>
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-black/5 pt-4 mt-6">
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>মক এক্সাম শুরু করুন</Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-ink">
                  <ArrowRight size={15} color="#fff" />
                </View>
              </View>
            </Pressable>

            {/* Custom Exam Card */}
            <Pressable
              onPress={() => router.push('/custom' as any)}
              style={
                {
                  width: width > 990 ? 'calc(33.333% - 10px)' : width > 640 ? 'calc(50% - 7px)' : '100%',
                  minHeight: 320,
                } as any
              }
              className="justify-between rounded-2xl border border-black/10 bg-surface p-6 sm:p-7 shadow-sm transition-all hover:border-black/30 hover:shadow-md active:scale-[0.99]">
              <View>
                <View className="mb-5 flex-row items-center justify-between">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-black/[0.04]">
                    <SlidersHorizontal size={24} color="#0A0A0A" />
                  </View>
                  <View className="rounded-full bg-black/[0.04] px-3 py-1">
                    <Text className="text-black/60" style={{ fontFamily: FONT.uiSemi, fontSize: 12 }}>
                      কাস্টমাইজড · পূর্ণ স্বাধীনতা
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-black/50"
                  style={{ fontFamily: FONT.uiSemi, fontSize: 11, marginBottom: 6 }}>
                  CUSTOM EXAM · কাস্টম এক্সাম
                </Text>
                <Text style={{ fontFamily: FONT.display, fontSize: 21, lineHeight: 29, marginBottom: 8 }}>
                  পছন্দমতো বিষয় ও প্রশ্ন সেট তৈরি করুন
                </Text>
                <Text
                  className="text-black/70"
                  style={{ fontFamily: FONT.ui, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                  পছন্দের বিসিএস ব্যাপ্তি (১০ম–৫০তম), নির্দিষ্ট বিষয় এবং প্রশ্নের সংখ্যা বেছে নিয়ে সম্পূর্ণ নিজস্ব আঙ্গিকে পরীক্ষা সাজিয়ে নিন।
                </Text>

                <View className="gap-2.5">
                  {[
                    '১০ম–৫০তম বিসিএস ব্যাপ্তি ও একাধিক বিষয়ের স্বাধীন নির্বাচন',
                    '২০০, ১২০, ৮০, ৬০ বা ৩০টি প্রশ্নের আনুপাতিক বা স্বনির্ধারিত সেট',
                    'সঠিক উত্তরে +১ ও ভুল উত্তরে −০.৫০ নেগেটিভ মার্কিং সহ স্কোর পর্যালোচনা',
                  ].map((feat) => (
                    <View key={feat} className="flex-row items-center gap-2.5">
                      <CheckCircle2 size={15} color="#16a34a" />
                      <Text className="text-black/80 flex-1" style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 19 }}>
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-black/5 pt-4 mt-6">
                <Text style={{ fontFamily: FONT.uiBold, fontSize: 15 }}>কাস্টম এক্সাম তৈরি করুন</Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-ink">
                  <ArrowRight size={15} color="#fff" />
                </View>
              </View>
            </Pressable>
          </View>
        </View>

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
