import '../global.css';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FONT, useAppFonts } from '../lib/fonts';
import { Bn, TopBar } from '../components/ui';
import { ExamQuitModal } from '../components/exam-quit-modal';
import { isAnyExamActive, useExamGuardStore } from '../store/examGuard';
import { useExamStore } from '../store/exam';
import { usePracticeStore } from '../store/practice';
import { useLibrary } from '../lib/library';
import { toBn } from '../lib/format';
import { applyTauriBodyClass, isTauri } from '../lib/tauri';

// Disable Reanimated strict-mode warning for internal library shared-value reads
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

/* Tauri-only tab-bar background: white on top + black 28px system strip below,
 * so the Android gesture pill floats on black (industry edge-to-edge look).
 * Paint ONLY — icons/labels/badge/listeners stay on the default React
 * Navigation bar (a full custom tabBar blanked the app on device).
 * Web/Vercel and RN native never mount this. */
const USE_TAURI_BAR_BG = isTauri();

function TauriBarBackground() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
      <View style={{ height: 28, backgroundColor: '#000000' }} />
    </View>
  );
}

export default function RootLayout() {
  const fontsOk = useAppFonts();
  const [qc] = useState(() => new QueryClient());
  const wrongBadgeCount = useLibrary((s) => s.wrongIds.length);

  const isMockRunning = useExamStore((s) => s.running);
  const isCustomRunning = usePracticeStore((s) => s.mode === 'custom' && s.started && !s.finished);
  const isExamActive = isMockRunning || isCustomRunning;
  // Tauri shell reserves room for the Android gesture pill; plain web gets none.
  const tauriBottomPad = isTauri() ? 28 : 0;
  // Wide screens fit every feature in the bar; narrow ones collapse the last
  // three into the "আরও" overflow tab.
  const { width } = useWindowDimensions();
  const isWideBar = width >= 768;

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

  // Tauri shell: tag <body> once so Tauri-only CSS (scroll-lock) applies.
  useEffect(() => {
    applyTauriBodyClass();
  }, []);

  // Browser guard against closing tab or refreshing mid-exam
  useEffect(() => {
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

  // Browser Back Button & History Guard
  useEffect(() => {
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
            tabBarBackground: USE_TAURI_BAR_BG ? TauriBarBackground : undefined,
            tabBarStyle: {
              backgroundColor: USE_TAURI_BAR_BG ? 'transparent' : '#FFFFFF',
              borderTopColor: 'rgba(0,0,0,.08)',
              height: 64 + tauriBottomPad,
              paddingTop: 6,
              paddingBottom: 6 + tauriBottomPad,
            },
            tabBarItemStyle: {
              paddingHorizontal: 0,
              paddingVertical: 0,
            },
            // NOTE: keep the default label renderer (style-only). A custom
            // tabBarLabel component clipped the last glyph of Bengali titles
            // on Android (হোম→হো, আরও→আর).
            tabBarLabelStyle: {
              fontFamily: FONT.uiSemi,
              fontSize: 11,
              marginTop: 2,
            },
            tabBarAllowFontScaling: false,
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
              title: 'কাস্টম এক্সাম',
              tabBarIcon: ({ color }) => <MaterialIcons name="tune" size={22} color={color} />,
            }}
          />
          {/* Wide screens show every feature; narrow screens collapse the
              last three into the "আরও" overflow tab. */}
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
                    tabBarIcon: ({ color }) => (
                      <MaterialIcons name="more-horiz" size={22} color={color} />
                    ),
                    tabBarItemStyle: {
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      display: isWideBar ? 'none' : 'flex',
                    },
                  }}
          />
          <Tabs.Screen
            name="results"
            listeners={createTabListener('/results')}
            options={{
                    href: '/results',
                    title: 'ফলাফল',
                    tabBarIcon: ({ color }) => (
                      <MaterialIcons name="bar-chart" size={22} color={color} />
                    ),
                    tabBarItemStyle: {
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      display: isWideBar ? 'flex' : 'none',
                    },
                  }}
          />
          <Tabs.Screen
            name="bookmarks"
            listeners={createTabListener('/bookmarks')}
            options={{
                    href: '/bookmarks',
                    title: 'বুকমার্ক',
                    tabBarIcon: ({ color }) => (
                      <MaterialIcons name="bookmark" size={22} color={color} />
                    ),
                    tabBarItemStyle: {
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      display: isWideBar ? 'flex' : 'none',
                    },
                  }}
          />
          <Tabs.Screen
            name="wrong"
            listeners={createTabListener('/wrong')}
            options={{
                    href: '/wrong',
                    title: 'ভুলসমূহ',
                    tabBarBadge: wrongBadgeCount > 0 ? toBn(wrongBadgeCount) : undefined,
                    tabBarBadgeStyle: {
                      backgroundColor: '#EA0000',
                      fontSize: 10,
                      fontFamily: FONT.digits,
                      top: -2,
                    },
                    tabBarIcon: ({ color }) => (
                      <MaterialIcons name="error" size={22} color={color} />
                    ),
                    tabBarItemStyle: {
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      display: isWideBar ? 'flex' : 'none',
                    },
                  }}
          />
          {/* OAuth deep-link landing (bcsconsole://auth-callback). */}
          <Tabs.Screen name="auth-callback" options={{ href: null } as any} />
        </Tabs>
        <ExamQuitModal />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
