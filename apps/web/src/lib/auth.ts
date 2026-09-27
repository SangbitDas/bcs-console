import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { db } from './supabase';
import { consumeTauriAuthUrls, getTauriStartUrls, isTauri, onTauriOpenUrl, openSystemBrowser } from './tauri';

let tauriDeepLinkListening = false;

/* Registers the Tauri deep-link listener once per app lifetime. Any
 * `bcsconsole://auth-callback?code=...` return from the system browser is
 * exchanged for a Supabase session (auth state flows through
 * onAuthStateChange like every other provider path). */
async function ensureTauriDeepLinkListener(): Promise<void> {
  if (!isTauri() || tauriDeepLinkListening) return;
  tauriDeepLinkListening = true;
  try {
    await onTauriOpenUrl((urls) => {
      consumeTauriAuthUrls(urls, completeAuthRedirect).catch(() => {});
    });
  } catch {
    tauriDeepLinkListening = false;
  }
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'full_name' | 'phone'>>) => Promise<void>;
}

/* Parses an OAuth redirect URL (native browser session or the
 * `bcsconsole://auth-callback` deep link) and turns it into a Supabase session.
 * PKCE returns `?code=`; the implicit flow returns tokens in the fragment. */
export async function completeAuthRedirect(url: string): Promise<{ error: Error | null }> {
  const grab = (key: string) => {
    const match = new RegExp(`[?&#]${key}=([^&#]+)`).exec(url);
    return match ? decodeURIComponent(match[1]) : null;
  };

  try {
    const code = grab('code');
    if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      return { error: error ?? null };
    }

    const accessToken = grab('access_token');
    const refreshToken = grab('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await db.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { error: error ?? null };
    }

    return { error: new Error('Google sign-in returned no authorization code') };
  } catch (err: any) {
    return { error: err };
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    try {
      // Tauri cold start via deep link (app was not running when the
      // system browser redirected back): consume the auth return first.
      if (isTauri()) {
        try {
          await ensureTauriDeepLinkListener();
          await consumeTauriAuthUrls(await getTauriStartUrls(), completeAuthRedirect);
        } catch {}
      }

      const { data: { session }, error } = await db.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        set({ session, user: session.user, loading: false, initialized: true });
        // Fetch or create user profile
        await fetchOrCreateProfile(session.user);
      } else {
        set({ session: null, user: null, profile: null, loading: false, initialized: true });
      }

      // Listen to auth events (sign in, token refresh, sign out)
      db.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          set({ session: newSession, user: newSession.user, loading: false });
          await fetchOrCreateProfile(newSession.user);
        } else {
          set({ session: null, user: null, profile: null, loading: false });
        }
      });
    } catch (err) {
      console.warn('Auth initialization error:', err);
      set({ loading: false, initialized: true });
    }
  },

  signInWithGoogle: async () => {
    try {
      const queryParams = { access_type: 'offline', prompt: 'select_account' };

      // Tauri (Android WebView shell): prefer the native Credential Manager
      // bottom sheet (device Gmail accounts, no password typing). The Google
      // ID token is exchanged via signInWithIdToken — no browser round-trip,
      // so no Supabase redirect URL is needed for this path. Falls back to
      // the system-browser + bcsconsole:// deep-link flow below.
      if (isTauri()) {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (webClientId) {
          try {
            const { signIn } = await import('@choochmeque/tauri-plugin-google-auth-api');
            const tokens = await signIn({
              clientId: webClientId,
              scopes: ['openid', 'email', 'profile'],
              flowType: 'native',
            });
            if (tokens.idToken) {
              const { error } = await db.auth.signInWithIdToken({
                provider: 'google',
                token: tokens.idToken,
                access_token: tokens.accessToken,
              });
              return { error: error ?? null };
            }
            console.warn('[tauri-auth] native returned no idToken, keys:', Object.keys(tokens ?? {}).join(','));
          } catch (err) {
            // User cancelled or Play Services unavailable — fall through to
            // the system-browser flow.
            console.warn('[tauri-auth] native failed, falling back:', err instanceof Error ? err.message : String(err));
          }
        } else {
          console.warn('[tauri-auth] missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, falling back');
        }

        const redirectTo = 'bcsconsole://auth-callback';
        await ensureTauriDeepLinkListener();
        const { data, error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true, queryParams },
        });
        if (error) return { error };
        if (!data?.url) return { error: new Error('Google sign-in URL was not returned') };

        await openSystemBrowser(data.url);
        return { error: null };
      }

      // Web: full-page redirect back to the current origin.
      if (Platform.OS === 'web') {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, queryParams },
        });
        return { error: error ?? null };
      }

      // Native: open the provider in a secure browser session, then exchange the
      // returned authorization code for a session via the app deep link (scheme
      // `bcsconsole`). Add this redirect URL to Supabase -> Authentication ->
      // URL Configuration -> Redirect URLs.
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true, queryParams },
      });
      if (error) return { error };
      if (!data?.url) return { error: new Error('Google sign-in URL was not returned') };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return { error: null };

      return completeAuthRedirect(result.url);
    } catch (err: any) {
      return { error: err };
    }
  },

  signOut: async () => {
    try {
      await db.auth.signOut();
      set({ session: null, user: null, profile: null });
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;

    try {
      const { data, error } = await db
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        set({ profile: data as UserProfile });
      }
    } catch (err) {
      console.warn('Profile update error:', err);
    }
  },
}));

async function fetchOrCreateProfile(user: User) {
  try {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      useAuthStore.setState({ profile: data as UserProfile });
      import('./library').then(({ useLibrary }) => useLibrary.getState().syncCloud()).catch(() => {});
      return;
    }

    // Fallback if trigger was delayed or didn't run
    const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
    const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '';
    const { data: inserted } = await db
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: name,
        email: user.email,
        avatar_url: avatar,
      })
      .select()
      .single();

    if (inserted) {
      useAuthStore.setState({ profile: inserted as UserProfile });
      import('./library').then(({ useLibrary }) => useLibrary.getState().syncCloud()).catch(() => {});
    }
  } catch (err) {
    console.warn('fetchOrCreateProfile error:', err);
  }
}

