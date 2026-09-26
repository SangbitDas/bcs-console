import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react';
import { FONT } from '../lib/fonts';
import { formatDateTimeBn, toBn } from '../lib/format';
import { useLibrary, sortRecents } from '../lib/library';
import { applyRerunConfig } from '../lib/rerun';
import { useExams } from '../hooks/queries';
import { Bn } from './ui';
import { Breadcrumb, RecentPracticeCard } from './patterns';

const MAX_RECENTS = 30;

/* Full recents list (opens from the Practice hub "আরও দেখুন" button).
   Shows the latest 30 practice sessions with pinned ones floated to the top. */
export function RecentsScreen() {
  const lib = useLibrary();
  const { data: exams } = useExams();

  const recents = sortRecents(
    lib.recents.filter(
      (r) => r.kind === 'practice' && r.rerun?.mode !== 'custom' && r.score === undefined,
    ),
  ).slice(0, MAX_RECENTS);

  const pinnedCount = recents.filter((r) => r.pinned).length;

  return (
    <ScrollView className="bg-paper" showsVerticalScrollIndicator={true}>
      <View className="mx-auto w-full max-w-[1100px] px-5 py-8">
        <Breadcrumb
          trail={[
            { label: 'হোম', href: '/' },
            { label: 'অনুশীলন', href: '/practice' },
            { label: 'সাম্প্রতিক অনুশীলন' },
          ]}
        />

        <View className="mb-5 flex-row items-start justify-between gap-3">
          <View>
            <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
            <Text style={{ fontFamily: FONT.displayBlack, fontSize: 26, lineHeight: 34 }}>
              সাম্প্রতিক অনুশীলন
            </Text>
            <Text className="mt-1 text-black/55" style={{ fontFamily: FONT.ui, fontSize: 13 }}>
              সর্বশেষ {toBn(MAX_RECENTS)}টি সেশন · {toBn(pinnedCount)}টি পিন করা
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/practice' as any)}
            className="flex-row items-center gap-1.5 rounded-lg border border-black/15 bg-surface px-4 py-2 transition-colors hover:border-black/30 active:bg-black/[0.03]">
            <ArrowLeft size={15} color="#0A0A0A" />
            <Bn style={{ fontFamily: FONT.uiBold, fontSize: 13 }}>ফিরে যান</Bn>
          </Pressable>
        </View>

        {recents.length > 0 ? (
          <View className="flex-row flex-wrap gap-3.5">
            {recents.map((r) => {
              const isDone = r.completed || (r.done && Object.keys(r.done).length >= r.total);
              const answered = r.done ? Object.keys(r.done).length : r.right + (r.wrong || 0);
              return (
                <RecentPracticeCard
                  key={r.id}
                  pinned={r.pinned}
                  onTogglePin={() => lib.togglePinRecent(r.key)}
                  title={
                    r.label
                      ? r.label.replace(/^কোনো পরীক্ষা নির্বাচিত নয় ·\s*/, 'সব বিসিএস · ')
                      : ''
                  }
                  sub="অনুশীলন"
                  scoreText={`${toBn(r.right)} / ${toBn(r.total)}`}
                  pctText={`${toBn(Math.round((answered / Math.max(1, r.total)) * 100))}% সম্পন্ন`}
                  pct={(answered / Math.max(1, r.total)) * 100}
                  dateText={formatDateTimeBn(r.at)}
                  actionText={isDone ? 'সম্পন্ন • আবার চর্চা' : 'চালিয়ে যান →'}
                  onPress={() => r.rerun && applyRerunConfig(r.rerun, r, exams)}
                />
              );
            })}
          </View>
        ) : (
          <View className="mt-4 items-center rounded-xl border border-dashed border-black/20 bg-surface p-10">
            <Text className="text-black/60" style={{ fontFamily: FONT.ui, fontSize: 15 }}>
              এখনো কোনো সাম্প্রতিক অনুশীলন নেই।
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}