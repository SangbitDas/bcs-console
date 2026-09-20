import '../global.css';
import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
import { FONT, useAppFonts } from '../lib/fonts';
import { TopBar } from '../components/ui';

import { useLibrary } from '../lib/library';
import { toBn } from '../lib/format';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsOk = useAppFonts();
  const [qc] = useState(() => new QueryClient());
  const lib = useLibrary();

  useEffect(() => {
    if (fontsOk) SplashScreen.hideAsync();
  }, [fontsOk]);

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
          options={{
            title: 'হোম',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="practice"
          options={{
            title: 'অনুশীলন',
            tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="exam"
          options={{
            title: 'মক এক্সাম',
            tabBarIcon: ({ color }) => <MaterialIcons name="timer" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="custom"
          options={{
            title: 'কাস্টম এক্সাম',
            tabBarIcon: ({ color }) => <MaterialIcons name="tune" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookmarks"
          options={{
            title: 'বুকমার্ক',
            tabBarBadge: lib.bookmarks.length > 0 ? toBn(lib.bookmarks.length) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EA0000', fontSize: 10, fontFamily: FONT.digits },
            tabBarIcon: ({ color }) => <MaterialIcons name="bookmark-border" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="wrong"
          options={{
            title: 'ভুলসমূহ',
            tabBarBadge: lib.wrongIds.length > 0 ? toBn(lib.wrongIds.length) : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EA0000', fontSize: 10, fontFamily: FONT.digits },
            tabBarIcon: ({ color }) => <MaterialIcons name="error-outline" size={22} color={color} />,
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}
