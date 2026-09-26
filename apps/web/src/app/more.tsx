import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Bookmark, ChevronRight, Layers } from 'lucide-react-native';
import { FONT } from '../lib/fonts';
import { toBn } from '../lib/format';
import { useLibrary } from '../lib/library';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { Bn } from '../components/ui';
import { Breadcrumb } from '../components/patterns';

/* Overflow tab: everything that no longer fits in the 5-item bottom bar. */
export default function MoreScreen() {
  const lib = useLibrary();

  // Navigating away mid-exam has to go through the same quit confirmation.
  const go = (href: string) => {
    if (isAnyExamActive()) {
      useExamGuardStore.getState().openQuitModal(() => router.push(href as any));
      return;
    }
    router.push(href as any);
  };

  const rows = [
    {
      title: 'কাস্টম এক্সাম',
      sub: 'নিজের বাছাই অনুযায়ী পরীক্ষা তৈরি করুন',
      icon: Layers,
      href: '/custom',
      count: 0,
    },
    {
      title: 'বুকমার্ক',
      sub: 'সংরক্ষিত প্রশ্নগুলো দেখুন',
      icon: Bookmark,
      href: '/bookmarks',
      count: lib.bookmarks.length,
    },
    {
      title: 'ভুলসমূহ',
      sub: 'ভুল উত্তর দেওয়া প্রশ্নগুলো দেখে শুধরুন',
      icon: AlertTriangle,
      href: '/wrong',
      count: lib.wrongIds.length,
    },
  ];

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1000px] px-5 py-8">
        <Breadcrumb trail={[{ label: 'হোম', href: '/' }, { label: 'আরও' }]} />

        <View className="mb-6">
          <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
          <Text style={{ fontFamily: FONT.displayBlack, fontSize: 26, lineHeight: 34 }}>
            আরও
          </Text>
          <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 14, marginTop: 4 }}>
            বাকি ফিচারগুলো এখানে।
          </Text>
        </View>

        <View className="overflow-hidden rounded-xl border border-black/10 bg-surface">
          {rows.map((row) => (
            <Pressable
              key={row.href}
              onPress={() => go(row.href)}
              className="flex-row items-center gap-3 border-b border-black/[0.07] px-4 py-4 transition-colors active:bg-black/5">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-black/[0.04]">
                <row.icon size={18} color="#0A0A0A" />
              </View>
              <View className="flex-1 pr-1">
                <Bn style={{ fontFamily: FONT.uiBold, fontSize: 15.5 }}>{row.title}</Bn>
                <Bn className="text-black/50" style={{ fontFamily: FONT.ui, fontSize: 12.5 }}>
                  {row.sub}
                </Bn>
              </View>
              {row.count > 0 ? (
                <View className="rounded-full bg-[#EA0000]/10 px-2.5 py-1">
                  <Bn style={{ fontFamily: FONT.uiBold, fontSize: 12, color: '#EA0000' }}>
                    {toBn(row.count)}
                  </Bn>
                </View>
              ) : null}
              <ChevronRight size={18} color="rgba(0,0,0,0.35)" />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
