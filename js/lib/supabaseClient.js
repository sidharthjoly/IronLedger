// Supabase is loaded lazily (dynamic import), only once the user actually
// requests cloud sync — the default, signed-out experience stays fully
// offline-capable with zero network dependency, exactly like the original
// localStorage-only version. Signing in is an opt-in upgrade, never a wall.

// Public by design: Supabase's publishable key is meant to ship client-side
// (like a Firebase config object) — actual data protection comes from the
// row-level security policies in supabase/schema.sql, not from hiding this.
const SUPABASE_URL = 'https://xlpfzfeonofswfenqeez.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_J59vvsq5mVUOYlCf2IvPnQ_5AmhQQuk';

export function isSupabaseConfigured() {
  return !SUPABASE_URL.includes('YOUR-PROJECT-REF');
}

let clientPromise = null;

async function getClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet — set SUPABASE_URL in js/lib/supabaseClient.js.');
  }
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    );
  }
  return clientPromise;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signInWithGoogle() {
  const supabase = await getClient();
  // Google sign-in is a full-page redirect (no popup), so drop any leftover
  // query/hash (e.g. a stale OAuth callback) rather than carrying it forward.
  const cleanUrl = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: cleanUrl },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = await getClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSupabaseClient() {
  return getClient();
}

// A synchronous, no-network check for whether this browser already has a
// Supabase session cached — lets the app decide whether it's worth lazily
// loading the SDK at all on a fresh page load. supabase-js persists its
// session under a `sb-<project-ref>-auth-token` localStorage key.
export function hasCachedSupabaseSession() {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
  } catch {
    return false;
  }
}

// True while the page is being loaded as the redirect target of an OAuth
// flow (Google sending the user back with `code=`/`access_token=` params) —
// the other case (besides an already-cached session) where it's worth
// loading the SDK unconditionally, since only the SDK can complete sign-in.
export function isOAuthRedirectInProgress() {
  const params = `${window.location.hash.replace(/^#/, '')}&${window.location.search.replace(/^\?/, '')}`;
  return /(access_token|refresh_token|code|error)=/.test(params);
}
