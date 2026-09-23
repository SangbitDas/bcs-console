import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  BookOpen,
  SlidersHorizontal,
  Timer,
  Sparkles,
} from 'lucide-react';
import { FONT } from '../lib/fonts';

interface StepPoint {
  id: string;
  stepNumber: string;
  boldTitle: string;
  subText: string;
  ctaText: string;
  route: string;
  icon: any;
}

const POINTS: StepPoint[] = [
  {
    id: 'step-01',
    stepNumber: '01',
    boldTitle: 'পূর্ববর্তী পরীক্ষার প্রশ্ন দেখুন',
    subText: 'পূর্ববর্তী বিসিএস পরীক্ষার প্রশ্নগুলো দেখে নিন এবং নিজের প্রস্তুতি যাচাই করুন।',
    ctaText: 'প্রশ্ন দেখুন',
    route: '/practice/exam',
    icon: BookOpen,
  },
  {
    id: 'step-02',
    stepNumber: '02',
    boldTitle: 'বিষয় ঠিক করুন',
    subText: 'দশটি বিষয়ের মধ্যে নিজের দুর্বল জায়গাগুলো বেছে নিন।',
    ctaText: 'বিষয় বাছাই করুন',
    route: '/practice/subject',
    icon: SlidersHorizontal,
  },
  {
    id: 'step-03',
    stepNumber: '03',
    boldTitle: 'এক্সাম শুরু করুন',
    subText: 'বিষয়ভিত্তিক অনুশীলন অথবা টাইমড মক দিয়ে নিজেকে যাচাই করুন।',
    ctaText: 'এক্সাম শুরু করুন',
    route: '/exam',
    icon: Timer,
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
      {/* 1. Header Pill: "কীভাবে শুরু করবেন" (Original Top Position) */}
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

      {/* 2. Main Title: "> তিন ধাপে প্রস্তুতি <" (Original Top Position) */}
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

      {/* 3. Horizontal Slider Divider Line on TOP, All 3 Cards Below on ONE side */}
      <View className="max-w-5xl mx-auto w-full relative">
        {isTablet ? (
          /* Desktop/Tablet: Horizontal line with 01, 02, 03 on top, all 3 cards underneath */
          <View className="relative w-full">
            {/* The Horizontal Slider Divider Line connecting all 3 nodes */}
            <View
              className="absolute left-[16%] right-[16%] h-[2px] bg-stone-300/80 z-0"
              style={{ top: 22 }}
            />

            {/* 3 Columns: Each with Node on top + Card below */}
            <View className="flex-row justify-between items-start w-full relative z-10">
              {POINTS.map((pt, idx) => {
                const isHovered = hoveredIdx === idx;
                const Icon = pt.icon;

                return (
                  <View
                    key={pt.id}
                    style={{ width: '31.5%' }}
                    className="flex-col items-center">
                    {/* Node on the Horizontal Slider Line (TOP) */}
                    <View className="items-center justify-center relative mb-4">
                      {/* Numbered Node Disc (01, 02, 03) - Monochrome Black & White */}
                      <Pressable
                        onPress={() => router.push(pt.route as any)}
                        onHoverIn={() => setHoveredIdx(idx)}
                        onHoverOut={() => setHoveredIdx(null)}
                        style={{ cursor: 'pointer' } as any}
                        className={`h-11 w-11 items-center justify-center rounded-full transition-all duration-300 z-10 ${
                          isHovered
                            ? 'bg-[#0A0A0A] text-white shadow-md ring-4 ring-black/15 scale-110'
                            : 'bg-white border-2 border-stone-400 text-[#0A0A0A] shadow-2xs'
                        }`}>
                        <Text
                          className={`text-sm font-black transition-colors ${
                            isHovered ? 'text-white' : 'text-[#0A0A0A]'
                          }`}
                          style={{
                            fontFamily: FONT_HEADLINE,
                            fontWeight: '800',
                          }}>
                          {pt.stepNumber}
                        </Text>
                      </Pressable>

                      {/* Small connector stem down to the card */}
                      <View
                        className={`w-[2px] h-3 transition-colors duration-300 ${
                          isHovered ? 'bg-[#0A0A0A]' : 'bg-stone-300/80'
                        }`}
                      />
                    </View>

                    {/* Card Below on the Same Side */}
                    <Pressable
                      onPress={() => router.push(pt.route as any)}
                      onHoverIn={() => setHoveredIdx(idx)}
                      onHoverOut={() => setHoveredIdx(null)}
                      style={{ cursor: 'pointer', minHeight: 180 } as any}
                      className={`w-full group rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 ${
                        isHovered
                          ? 'border-stone-400 shadow-md -translate-y-1'
                          : 'border-stone-200/90 hover:border-stone-300'
                      }`}>
                      {/* Card Header with Icon & Arrow (Monochrome Black & White) */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View
                          className={`h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                            isHovered
                              ? 'bg-[#0A0A0A] text-white shadow-xs'
                              : 'bg-stone-100 text-[#0A0A0A] border border-stone-200'
                          }`}>
                          <Icon
                            size={18}
                            color={isHovered ? '#FFFFFF' : '#0A0A0A'}
                            strokeWidth={2.2}
                          />
                        </View>
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-full transition-colors ${
                            isHovered ? 'bg-[#0A0A0A] text-white' : 'bg-stone-50 text-stone-500'
                          }`}>
                          <ArrowRight
                            size={13}
                            color={isHovered ? '#FFFFFF' : '#78716C'}
                            strokeWidth={2.2}
                          />
                        </View>
                      </View>

                      {/* Bold Title */}
                      <Text
                        style={{
                          fontFamily: FONT_HEADLINE,
                          fontSize: 18,
                          lineHeight: 25,
                          fontWeight: '700',
                          color: isHovered ? '#0A0A0A' : '#1C1917',
                        }}>
                        {pt.boldTitle}
                      </Text>

                      {/* Sub-text */}
                      <Text
                        className="mt-1.5 text-stone-600 text-xs leading-relaxed"
                        style={{
                          fontFamily: FONT_BODY,
                          lineHeight: 20,
                          color: '#4B5563',
                        }}>
                        {pt.subText}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* Mobile Linear Vertical Stack */
          <View className="flex-col">
            {POINTS.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              const isLast = idx === POINTS.length - 1;
              const Icon = pt.icon;

              return (
                <View key={pt.id} className="relative flex-row items-start gap-4">
                  {/* Slider Node and Connecting Line */}
                  <View className="items-center" style={{ width: 44 }}>
                    <Pressable
                      onPress={() => router.push(pt.route as any)}
                      onHoverIn={() => setHoveredIdx(idx)}
                      onHoverOut={() => setHoveredIdx(null)}
                      style={{ cursor: 'pointer' } as any}
                      className={`h-11 w-11 items-center justify-center rounded-full transition-all duration-300 z-10 ${
                        isHovered
                          ? 'bg-[#0A0A0A] text-white shadow-md ring-4 ring-black/15 scale-105'
                          : 'bg-white border-2 border-stone-400 text-[#0A0A0A] shadow-2xs'
                      }`}>
                      <Text
                        className={`text-sm font-black transition-colors ${
                          isHovered ? 'text-white' : 'text-[#0A0A0A]'
                        }`}
                        style={{
                          fontFamily: FONT_HEADLINE,
                          fontWeight: '800',
                        }}>
                        {pt.stepNumber}
                      </Text>
                    </Pressable>

                    {!isLast && (
                      <View
                        className={`w-[2px] my-1 transition-colors duration-300 ${
                          isHovered ? 'bg-[#0A0A0A]' : 'bg-stone-300/80'
                        }`}
                        style={{ minHeight: 70, flex: 1 }}
                      />
                    )}
                  </View>

                  {/* Card with Icon */}
                  <Pressable
                    onPress={() => router.push(pt.route as any)}
                    onHoverIn={() => setHoveredIdx(idx)}
                    onHoverOut={() => setHoveredIdx(null)}
                    style={{ cursor: 'pointer', flex: 1 } as any}
                    className={`mb-5 rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 ${
                      isHovered
                        ? 'border-stone-400 shadow-md -translate-y-0.5'
                        : 'border-stone-200/90 hover:border-stone-300'
                    }`}>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                          isHovered ? 'bg-[#0A0A0A] text-white' : 'bg-stone-100 text-[#0A0A0A] border border-stone-200'
                        }`}>
                        <Icon size={18} color={isHovered ? '#FFFFFF' : '#0A0A0A'} />
                      </View>
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full transition-colors ${
                          isHovered ? 'bg-[#0A0A0A] text-white' : 'bg-stone-100 text-stone-500'
                        }`}>
                        <ArrowRight
                          size={13}
                          color={isHovered ? '#FFFFFF' : '#78716C'}
                          strokeWidth={2.2}
                        />
                      </View>
                    </View>

                    <Text
                      style={{
                        fontFamily: FONT_HEADLINE,
                        fontSize: 18,
                        lineHeight: 25,
                        fontWeight: '700',
                        color: isHovered ? '#0A0A0A' : '#1C1917',
                      }}>
                      {pt.boldTitle}
                    </Text>
                    <Text
                      className="mt-1 text-stone-600 text-xs leading-relaxed"
                      style={{
                        fontFamily: FONT_BODY,
                        lineHeight: 20,
                        color: '#4B5563',
                      }}>
                      {pt.subText}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
