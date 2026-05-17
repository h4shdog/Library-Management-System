import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        // Prevent multiple tabs/instances from fighting over the auth lock
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'library-auth-token',
      },
    }
  );
}
