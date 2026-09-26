import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { useExamGuardStore } from '../store/examGuard';

export function ExamQuitModal() {
  const visible = useExamGuardStore((s) => s.showQuitModal);
  const close = useExamGuardStore((s) => s.closeQuitModal);
  const confirmQuit = useExamGuardStore((s) => s.confirmQuit);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={close}>
      <View
        className="flex-1 items-center justify-center p-4 bg-black/65"
        style={{ backdropFilter: 'blur(4px)' } as any}>
        <View className="w-full max-w-[440px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-stone-200/90">
          {/* Alert Icon Badge */}
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200">
            <AlertTriangle size={24} color="#D97706" strokeWidth={2.2} />
          </View>

          {/* Heading Title */}
          <Text
            className="text-stone-900 mb-2"
            style={{
              fontFamily: "'Anek Bangla', " + FONT.displayBold,
              fontSize: 20,
              lineHeight: 28,
              fontWeight: '800',
            }}>
            আপনি কি পরীক্ষা থেকে বের হতে চান?
          </Text>

          {/* Subtitle / Warning message */}
          <Text
            className="text-stone-600 mb-6 leading-relaxed text-sm"
            style={{
              fontFamily: "'Hind Siliguri', " + FONT.ui,
              lineHeight: 22,
            }}>
            এখন বের হয়ে গেলে এই পরীক্ষার কোনো ফলাফল তৈরি হবে না এবং আপনার বর্তমান উত্তরগুলো সংরক্ষিত থাকবে না।
          </Text>

          {/* Action Buttons */}
          <View className="flex-row items-center justify-end gap-3">
            {/* Destructive Exit Button */}
            <Pressable
              onPress={confirmQuit}
              style={{ cursor: 'pointer' } as any}
              className="flex-1 py-3 px-3 sm:px-4 rounded-xl border border-red-200 bg-red-50 items-center justify-center transition-all hover:bg-red-100 active:scale-95">
              <Text
                className="text-red-700 text-xs sm:text-sm font-bold text-center"
                style={{ fontFamily: "'Hind Siliguri', " + FONT.uiSemi }}>
                পরীক্ষা বাতিল ও প্রস্থান
              </Text>
            </Pressable>

            {/* Primary Safe Button: Return to Exam */}
            <Pressable
              onPress={close}
              style={{ cursor: 'pointer' } as any}
              className="flex-1 py-3 px-3 sm:px-4 rounded-xl bg-[#0A0A0A] items-center justify-center shadow-sm transition-all hover:bg-stone-800 active:scale-95">
              <Text
                className="text-white text-xs sm:text-sm font-bold text-center"
                style={{ fontFamily: "'Hind Siliguri', " + FONT.uiSemi }}>
                পরীক্ষায় ফিরে যান
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
