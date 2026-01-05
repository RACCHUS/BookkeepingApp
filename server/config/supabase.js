/**
 * @fileoverview Supabase Configuration
 * @description Supabase client configuration for database and auth
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.warn('⚠️ SUPABASE_URL not set - Supabase will not be available');
}

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - Supabase admin operations will fail');
}

/**
 * Supabase Admin Client (with service role key)
 * Use this for server-side operations that need to bypass RLS
 */
let supabaseAdmin = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase Admin client initialized');
}

/**
 * Supabase Public Client (with anon key)
 * Use this for operations that should respect RLS
 */
let supabaseClient = null;
if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase Public client initialized');
}

/**
 * Get the Supabase admin client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabaseAdmin;
}

/**
 * Get the Supabase public client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase public client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  return supabaseClient;
}

/**
 * Check if Supabase is configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseServiceKey);
}

export { supabaseAdmin, supabaseClient };
export default supabaseAdmin;
