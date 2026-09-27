import '../global.css';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
import { BackHandler, LogBox, Platform } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { FONT, useAppFonts } from '../lib/fonts';
import { TopBar } from '../components/ui';
import { ExamQuitModal } from '../components/exam-quit-modal';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { useExamStore } from '../store/exam';
import { usePracticeStore } from '../store/practice';
import { useLibrary } from '../lib/library';
import { toBn } from '../lib/format';

// Disable Reanimated strict-mode warning for internal library shared-value reads
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Suppress development warning overlays from covering the bottom navigation bar
LogBox.ignoreLogs([
  '[Reanimated]',
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsOk = useAppFonts();
  const [qc] = useState(() => new QueryClient());
  const wrongBadgeCount = useLibrary((s) => s.wrongIds.length);

  const isMockRunning = useExamStore((s) => s.running);
  const isCustomRunning = usePracticeStore((s) => s.mode === 'custom' && s.started && !s.finished);
  const isExamActive = isMockRunning || isCustomRunning;
  // Bottom safe-area inset for the tab bar (0 on web).
  const bottomInset = Platform.OS === 'web' ? 0 : initialWindowMetrics?.insets.bottom ?? 0;

  useEffect(() => {
    let isMounted = true;
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    };

    if (fontsOk) {
      hideSplash();
    } else {
      // Safety timeout: never freeze on splash screen for more than 1.2s
      const timer = setTimeout(hideSplash, 1200);
      return () => {
        clearTimeout(timer);
        isMounted = false;
      };
    }
  }, [fontsOk]);

  // Web browser guard against closing tab or refreshing mid-exam
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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
    if (Platform.OS !== 'web') return;
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
          router.replace('/');
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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <Tabs
          screenOptions={{
            header: () => <TopBar />,
            tabBarActiveTintColor: '#EA0000',
            tabBarInactiveTintColor: 'rgba(0,0,0,.5)',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: 'rgba(0,0,0,.08)',
              height: Platform.OS === 'web' ? 64 : 58 + bottomInset,
              paddingTop: 6,
              paddingBottom: Platform.OS === 'web' ? 6 : Math.max(bottomInset, 6),
            },
            tabBarItemStyle: {
              paddingVertical: 2,
            },
            tabBarLabelStyle: { fontFamily: FONT.uiSemi, fontSize: 11, marginTop: 2 },
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
            name="results"
            listeners={createTabListener('/results')}
            options={{
              title: 'ফলাফল',
              tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="more"
            listeners={createTabListener('/more')}
            options={{
              title: 'আরও',
              tabBarBadge: wrongBadgeCount > 0 ? toBn(wrongBadgeCount) : undefined,
              tabBarBadgeStyle: {
                backgroundColor: '#EA0000',
                fontSize: 10,
                fontFamily: FONT.digits,
                top: -2,
              },
              tabBarIcon: ({ color }) => <MaterialIcons name="more-horiz" size={22} color={color} />,
            }}
          />
          {/* Still routable, but hidden from the tab bar — opened from the "আরও" tab. */}
          <Tabs.Screen name="custom" options={{ href: null } as any} />
          <Tabs.Screen name="bookmarks" options={{ href: null } as any} />
          <Tabs.Screen name="wrong" options={{ href: null } as any} />
          {/* OAuth deep-link landing (bcsconsole://auth-callback). */}
          <Tabs.Screen name="auth-callback" options={{ href: null } as any} />
        </Tabs>
        <ExamQuitModal />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
