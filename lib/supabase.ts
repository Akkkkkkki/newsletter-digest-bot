import { createClient, SupabaseClient } from '@supabase/supabase-js';

// IMPORTANT: This connects to REMOTE SUPABASE ONLY - no local database
// Client-side Supabase client with lazy initialization for Next.js
let supabaseInstance: SupabaseClient | null = null;

export const supabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}; 