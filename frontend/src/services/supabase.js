import { createClient } from '@supabase/supabase-js';

let client;

const configurationError =
  'A valid Supabase project is required. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the frontend environment.';

const settings = () => ({
  url: import.meta.env.VITE_SUPABASE_URL?.trim(),
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
});

export function isSupabaseConfigured() {
  const { url, publishableKey } = settings();
  return Boolean(url && publishableKey && url !== 'https://your-project.supabase.co' &&
    publishableKey !== 'your-supabase-publishable-key');
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(configurationError);
  }

  if (!client) {
    const { url, publishableKey } = settings();
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(configurationError);
    }
    const isLocalHttp =
      parsedUrl.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== 'https:' && !isLocalHttp) {
      throw new Error(configurationError);
    }
    client = createClient(url, publishableKey, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    });
  }

  return client;
}
