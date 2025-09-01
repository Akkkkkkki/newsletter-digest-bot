const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: This connects to REMOTE SUPABASE ONLY - no local database
// Server-side Supabase client for API routes
// Debug logs removed for security - credentials should not be logged in production

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set in environment variables.');
}

// Use service role key for backend, fallback to anon key if not set (should not happen in production)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

module.exports = { supabase }; 