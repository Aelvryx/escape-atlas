import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;

export interface SupabaseBrowserConfiguration {
  url: string;
  publishableKey: string;
}

export function getSupabaseBrowserConfiguration(): SupabaseBrowserConfiguration | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !isLocal) return null;
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;

  const configuration = getSupabaseBrowserConfiguration();
  if (!configuration) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createClient(configuration.url, configuration.publishableKey, {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
    },
  });

  return browserClient;
}
