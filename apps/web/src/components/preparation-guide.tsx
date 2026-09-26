import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowRight,
  BookOpen,
  SlidersHorizontal,
  Timer,
  Sparkles,
} from 'lucide-react-native';
import { FONT } from '../lib/fonts';
import { db } from '../lib/supabase';

const STEP_1_IMG = db.storage.from('bcs-images').getPublicUrl('steps/step-1.png').data.publicUrl;
const STEP_2_IMG = db.storage.from('bcs-images').getPublicUrl('steps/step-2.png').data.publicUrl;
const STEP_3_IMG = db.storage.from('bcs-images').getPublicUrl('steps/step-3.png').data.publicUrl;

interface StepPoint {
  id: string;
  stepNumber: string;
  boldTitle: string;
  subText: string;
  ctaText: string;
  route: string;
  icon: any;
  image: string;
}

const POINTS: StepPoint[] = [
  {
    id: 'step-01',
    stepNumber: '01',
    boldTitle: 'পূর্ববর্তী পরীক্ষার প্রশ্ন দেখুন',
    subText: 'বিসিএস প্রিলিমিনারি পরীক্ষার প্রশ্নগুলো দেখে নিন এবং নিজের প্রস্তুতি ঝালাই করুন।',
    ctaText: 'প্রশ্ন দেখুন',
    route: '/practice/exam',
    icon: BookOpen,
    image: STEP_1_IMG,
  },
  {
    id: 'step-02',
    stepNumber: '02',
    boldTitle: 'বিষয় ঠিক করুন',
    subText: 'দশটি বিষয়ের মধ্যে নিজের দুর্বল জায়গাগুলো বেছে নিন।',
    ctaText: 'বিষয় বাছাই করুন',
    route: '/practice/subject',
    icon: SlidersHorizontal,
    image: STEP_2_IMG,
  },
  {
    id: 'step-03',
    stepNumber: '03',
    boldTitle: 'এক্সাম শুরু করুন',
    subText: 'বিষয়ভিত্তিক অনুশীলন অথবা টাইমার ধরে দিয়ে নিজেকে যাচাই করুন।',
    ctaText: 'এক্সাম শুরু করুন',
    route: '/exam',
    icon: Timer,
    image: STEP_3_IMG,
  },
];

const FONT_HEADLINE = "'Anek Bangla', " + FONT.displayBold;
const FONT_BODY = "'Hind Siliguri', " + FONT.ui;
const FONT_BODY_SEMI = "'Hind Siliguri', " + FONT.uiSemi;

export function PreparationGuideSection() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <View className="mb-16 w-full py-2">
      {/* 1. Header Pill: "কীভাবে শুরু করবেন" */}
      <View className="items-center mb-3">
        <View className="flex-row items-center gap-1.5 rounded-full bg-[#EDE8DF] px-4 py-1.5 shadow-2xs">
          <Sparkles size={12} color="#78716C" />
          <Text
            className="text-stone-700 text-xs font-semibold tracking-wide"
            style={{ fontFamily: FONT_BODY_SEMI }}>
            কীভাবে শুরু করবেন
          </Text>
        </View>
      </View>

      {/* 2. Main Title: "তিন ধাপে প্রস্তুতি" */}
      <View className="items-center mb-10 sm:mb-12">
        <View className="flex-row items-center justify-center gap-2 sm:gap-3">
          {/* Left Red Wings */}
          <View className="flex-col gap-1 items-center justify-center">
            <View className="h-[3px] w-3.5 -rotate-45 rounded-full bg-[#DC2626]" />
            <View className="h-[3px] w-3.5 rotate-45 rounded-full bg-[#DC2626]" />
          </View>

          {/* Title Text */}
          <View className="items-center">
            <Text
              style={{
                fontFamily: FONT_HEADLINE,
                fontSize: width > 600 ? 36 : 26,
                lineHeight: width > 600 ? 46 : 34,
                color: '#0A0A0A',
                fontWeight: '800',
                letterSpacing: -0.5,
              }}>
              তিন ধাপে <Text style={{ color: '#DC2626' }}>প্রস্তুতি</Text>
            </Text>

            {/* Hand-drawn style decorative red curved underline */}
            <View className="w-full flex-row justify-end pr-2 -mt-1">
              <View className="h-[3px] w-28 rounded-full bg-[#DC2626]/90" />
            </View>
          </View>

          {/* Right Red Wings */}
          <View className="flex-col gap-1 items-center justify-center">
            <View className="h-[3px] w-3.5 rotate-45 rounded-full bg-[#DC2626]" />
            <View className="h-[3px] w-3.5 -rotate-45 rounded-full bg-[#DC2626]" />
          </View>
        </View>
      </View>

      {/* 3. 3-Card Grid Matching Mockup */}
      <View className="max-w-5xl mx-auto w-full">
        <View
          className={
            isTablet
              ? 'flex-row items-stretch gap-5 w-full'
              : 'flex-col gap-5 w-full'
          }>
          {POINTS.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const Icon = pt.icon;

            return (
              <Pressable
                key={pt.id}
                onPress={() => router.push(pt.route as any)}
                onHoverIn={() => setHoveredIdx(idx)}
                onHoverOut={() => setHoveredIdx(null)}
                style={{
                  cursor: 'pointer',
                  flex: isTablet ? 1 : undefined,
                  minHeight: 345,
                } as any}
                className={`group rounded-[28px] border bg-white pt-6 px-6 pb-0 shadow-xs transition-all duration-300 flex-col justify-between overflow-hidden ${
                  isHovered
                    ? 'border-stone-400 shadow-md -translate-y-1'
                    : 'border-stone-200/90 hover:border-stone-300'
                }`}>
                {/* Top Section */}
                <View className="w-full">
                  {/* Top Row: Icon Badge (Left) & Arrow Button (Right) */}
                  <View className="flex-row items-center justify-between mb-4">
                    {/* Icon Badge */}
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                        isHovered ? 'bg-[#ECE5DC]' : 'bg-[#F4EFEA]'
                      }`}>
                      <Icon
                        size={20}
                        color="#1C1917"
                        strokeWidth={2.2}
                      />
                    </View>

                    {/* Arrow Button */}
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                        isHovered
                          ? 'bg-[#0A0A0A] text-white shadow-xs'
                          : 'bg-[#F4EFEA] text-[#1C1917]'
                      }`}>
                      <ArrowRight
                        size={15}
                        color={isHovered ? '#FFFFFF' : '#1C1917'}
                        strokeWidth={2.2}
                      />
                    </View>
                  </View>

                  {/* Title */}
                  <Text
                    className="mb-2"
                    style={{
                      fontFamily: FONT_HEADLINE,
                      fontSize: 19,
                      lineHeight: 27,
                      fontWeight: '800',
                      color: '#0A0A0A',
                    }}>
                    {pt.boldTitle}
                  </Text>

                  {/* Sub-text */}
                  <Text
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      lineHeight: 21,
                      color: '#6B7280',
                    }}>
                    {pt.subText}
                  </Text>
                </View>

                {/* Bottom Illustration - flush with card bottom */}
                <View
                  className="w-full items-center justify-end overflow-hidden mt-3"
                  style={{ height: 160 }}>
                  <Image
                    source={{ uri: pt.image }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    contentFit="contain"
                    contentPosition="bottom center"
                    transition={200}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
