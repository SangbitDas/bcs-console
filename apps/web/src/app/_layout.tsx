import '../global.css';
import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import { FONT, useAppFonts } from '../lib/fonts';
import { TopBar } from '../components/ui';
import { ExamQuitModal } from '../components/exam-quit-modal';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { useExamStore } from '../store/exam';
import { usePracticeStore } from '../store/practice';
import { useLibrary } from '../lib/library';
import { toBn } from '../lib/format';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsOk = useAppFonts();
  const [qc] = useState(() => new QueryClient());
  const lib = useLibrary();

  const isMockRunning = useExamStore((s) => s.running);
  const isCustomRunning = usePracticeStore((s) => s.mode === 'custom' && s.started && !s.finished);
  const isExamActive = isMockRunning || isCustomRunning;

  useEffect(() => {
    if (fontsOk) SplashScreen.hideAsync();
  }, [fontsOk]);

  // Web browser guard against closing tab or refreshing mid-exam
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyExamActive()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Web browser Back Button & History Guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isExamActive) return;

    // Push a guard checkpoint into browser history to capture the back action
    window.history.pushState({ bcsExamGuard: true }, document.title, window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      if (!isAnyExamActive()) return;

      // 1. Crucial: Stop Expo Router / React Navigation from seeing and handling this popstate
      e.stopImmediatePropagation();

      // 2. Immediately restore the guarded history state
      window.history.pushState({ bcsExamGuard: true }, document.title, window.location.href);

      // 3. Trigger the quit confirmation modal
      useExamGuardStore.getState().openQuitModal(() => {
        // User confirmed exit
        if (window.history.length > 2) {
          window.history.go(-2);
        } else {
          router.replace('/');
        }
      });
    };

    // Use capture phase (true) to intercept popstate BEFORE React Navigation's listener
    window.addEventListener('popstate', handlePopState, true);

    return () => {
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [isExamActive]);

  // Android hardware back button guard
  useEffect(() => {
    if (!isExamActive) return;

    const onBackPress = () => {
      if (isAnyExamActive()) {
        useExamGuardStore.getState().openQuitModal(() => {
          if (typeof window !== 'undefined' && window.history.length > 2) {
            window.history.go(-2);
          } else {
            router.replace('/');
          }
        });
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isExamActive]);

  const createTabListener = (targetRoute: string) => ({
    tabPress: (e: any) => {
      if (isAnyExamActive()) {
        e.preventDefault();
        useExamGuardStore.getState().openQuitModal(() => {
          router.push(targetRoute as any);
        });
      }
    },
  });

  if (!fontsOk) return null;

  return (
    <QueryClientProvider client={qc}>
      <Tabs
        screenOptions={{
          header: () => <TopBar />,
          tabBarActiveTintColor: '#EA0000',
          tabBarInactiveTintColor: 'rgba(0,0,0,.5)',
          tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: 'rgba(0,0,0,.12)', height: 64 },
          tabBarLabelStyle: { fontFamily: FONT.uiSemi, fontSize: 12 },
        }}>
        <Tabs.Screen
          name="index"
          listeners={createTabListener('/')}
          options={{
            title: 'হোম',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="practice"
          listeners={createTabListener('/practice')}
          options={{
            title: 'অনুশীলন',
            tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="exam"
          listeners={createTabListener('/exam')}
          options={{
            title: 'মক এক্সাম',
            tabBarIcon: ({ color }) => <MaterialIcons name="timer" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="custom"
          listeners={createTabListener('/custom')}
          options={{
            title: 'কাস্টম',
            tabBarIcon: ({ color }) => <MaterialIcons name="tune" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="results"
          listeners={createTabListener('/results')}
          options={{
            title: 'ফলাফল',
            tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookmarks"
          listeners={createTabListener('/bookmarks')}
          options={{
            title: 'বুকমার্ক',
            tabBarBadge: lib.bookmarks.length > 0 ? toBn(lib.bookmarks.length) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EA0000', fontSize: 10, fontFamily: FONT.digits },
            tabBarIcon: ({ color }) => <MaterialIcons name="bookmark-border" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="wrong"
          listeners={createTabListener('/wrong')}
          options={{
            title: 'ভুলসমূহ',
            tabBarBadge: lib.wrongIds.length > 0 ? toBn(lib.wrongIds.length) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EA0000', fontSize: 10, fontFamily: FONT.digits },
            tabBarIcon: ({ color }) => <MaterialIcons name="error-outline" size={22} color={color} />,
          }}
        />
      </Tabs>
      <ExamQuitModal />
    </QueryClientProvider>
  );
}
