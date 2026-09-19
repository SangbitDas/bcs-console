import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/* Supabase configuration for BCS Console */
const SUPABASE_URL = 'https://cbebidcjrijottcqlqpq.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZWJpZGNqcmlqb3R0Y3FscXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzAwNDUsImV4cCI6MjEwNDcwNjA0NX0.71C05YESToLW7dJ2VBiQc0JH23U3Cg28yuWmNCm1hec';

const isBrowser = typeof window !== 'undefined';

const ssrStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: isBrowser ? AsyncStorage : ssrStorage,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});

