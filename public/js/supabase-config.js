window.VIDYAROOPA_SUPABASE = {
  url: 'https://ndvfdqwgnxogswaguqjp.supabase.co',
  anonKey: 'sb_publishable_i0AKW2Fu0e6PO9FQI_266Q_RLqiAWwt'
};

const { url, anonKey } = window.VIDYAROOPA_SUPABASE;
const configured = url.startsWith('https://') && !url.includes('YOUR_') && anonKey && !anonKey.includes('YOUR_');
window.supabaseClient = configured && window.supabase?.createClient
  ? window.supabase.createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;
