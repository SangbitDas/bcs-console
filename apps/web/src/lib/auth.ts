import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { db } from './supabase';

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

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    try {
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

      const match = /[?&#]code=([^&#]+)/.exec(result.url);
      if (!match) return { error: new Error('Google sign-in returned no authorization code') };

      const { error: sessionError } = await db.auth.exchangeCodeForSession(
        decodeURIComponent(match[1]),
      );
      return { error: sessionError ?? null };
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

