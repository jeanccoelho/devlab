import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

export function createSupabaseServerClient(request: Request) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const authHeader = request.headers.get('Authorization');

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: authHeader ? {
        Authorization: authHeader,
      } : {},
    },
  });
}

export async function getSession(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) {
    return null;
  }

  const supabase = createSupabaseServerClient(request);
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.error('Error getting user:', error);
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: '',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

export async function requireAuth(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return session;
}

export async function getUserProfile(request: Request) {
  const session = await requireAuth(request);
  const supabase = createSupabaseServerClient(request);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle() as { data: Database['public']['Tables']['user_profiles']['Row'] | null; error: any };

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Response('Error fetching profile', { status: 500 });
  }

  if (!profile) {
    throw new Response('Profile not found', { status: 404 });
  }

  return profile;
}

export async function requireAdmin(request: Request) {
  const profile = await getUserProfile(request);

  if (profile.role !== 'admin') {
    throw new Response('Forbidden: Admin access required', { status: 403 });
  }

  return profile;
}
