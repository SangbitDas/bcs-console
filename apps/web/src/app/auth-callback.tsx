import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { completeAuthRedirect } from '../lib/auth';
import { db } from '../lib/supabase';
import { FONT } from '../lib/fonts';
import { Bn } from '../components/ui';

/*
 * Landing screen for the OAuth deep link (`bcsconsole://auth-callback?code=...`).
 * `signInWithGoogle` normally completes the exchange from the browser session;
 * this screen exists so Android can also open the app directly on that URL
 * without expo-router falling through to "Unmatched Route".
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await db.auth.getSession();
        if (!data.session) {
          const query = Object.entries(params)
            .filter(([, value]) => typeof value === 'string' && value.length > 0)
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
            .join('&');
          const initialUrl = await Linking.getInitialURL();
          const candidate = query ? `bcsconsole://auth-callback?${query}` : initialUrl ?? '';
          if (candidate.includes('code=') || candidate.includes('access_token=')) {
            await completeAuthRedirect(candidate);
          }
        }
      } catch {
        // The browser-session path may already have consumed the code.
      }
      if (!cancelled) router.replace('/');
    })();

    return () => {
      cancelled = true;
    };
    // Deep-link params are available on first render, so this runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-paper">
      <ActivityIndicator color="#EA0000" />
      <Bn style={{ fontFamily: FONT.ui, fontSize: 14, color: 'rgba(0,0,0,0.6)' }}>
        লগইন সম্পন্ন হচ্ছে…
      </Bn>
    </View>
  );
}
