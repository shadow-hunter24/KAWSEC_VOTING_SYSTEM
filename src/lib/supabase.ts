import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL is not set. ' +
    'Add it to your .env file (see .env.example).'
  );
}
if (!supabaseKey || supabaseKey.trim() === '') {
  throw new Error(
    '[supabase] VITE_SUPABASE_PUBLISHABLE_KEY is not set. ' +
    'Add it to your .env file (see .env.example).'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
