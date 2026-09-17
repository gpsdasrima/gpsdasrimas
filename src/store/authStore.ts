import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { rowToProfile } from '../lib/mappers';
import type { Database } from '../lib/database.types';
import type { UserProfile } from '../types';

interface AuthResult {
  ok: boolean;
  error?: string;
  /** true quando o projeto exige confirmação de e-mail antes do primeiro login. */
  needsEmailConfirmation?: boolean;
}

interface AuthState {
  currentUser: UserProfile | null;
  /** true até a primeira checagem de sessão (localStorage do Supabase) terminar. */
  initializing: boolean;
  /** Usado só pelo painel admin, para listar usuários. */
  allProfiles: UserProfile[];

  init: () => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    city?: string;
    state?: string;
  }) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'avatar' | 'city' | 'state'>>) => Promise<boolean>;
  /** Promove outra conta a administrador (só funciona se quem chama já for admin — RPC valida no servidor). */
  promoteToAdmin: (email: string) => Promise<AuthResult>;
  fetchAllProfiles: () => Promise<void>;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

async function loadProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return rowToProfile(data);
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  initializing: true,
  allProfiles: [],

  init: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const profile = await loadProfile(data.session.user.id);
      set({ currentUser: profile, initializing: false });
    } else {
      set({ currentUser: null, initializing: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        set({ currentUser: profile });
      } else {
        set({ currentUser: null });
      }
    });
  },

  signup: async ({ name, email, password, city, state }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name, city, state },
      },
    });

    if (error) {
      return { ok: false, error: errorMessage(error, 'Não foi possível criar sua conta.') };
    }

    if (!data.session) {
      // Projeto com confirmação de e-mail ativada: a conta foi criada, mas
      // ainda não há sessão — o usuário precisa confirmar o e-mail antes de entrar.
      return { ok: true, needsEmailConfirmation: true };
    }

    const profile = await loadProfile(data.session.user.id);
    set({ currentUser: profile });
    return { ok: true };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.session) {
      return { ok: false, error: errorMessage(error, 'E-mail ou senha inválidos.') };
    }
    const profile = await loadProfile(data.session.user.id);
    set({ currentUser: profile });
    return { ok: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null });
  },

  updateProfile: async (data) => {
    const current = useAuthStore.getState().currentUser;
    if (!current) return false;

    const patch: Database['public']['Tables']['profiles']['Update'] = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.avatar !== undefined) patch.avatar_url = data.avatar || null;
    if (data.city !== undefined) patch.city = data.city || null;
    if (data.state !== undefined) patch.state = data.state || null;

    const { data: row, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', current.id)
      .select('*')
      .single();

    if (error || !row) return false;
    set({ currentUser: rowToProfile(row) });
    return true;
  },

  promoteToAdmin: async (email) => {
    const { error } = await supabase.rpc('promote_to_admin', { target_email: email.trim().toLowerCase() });
    if (error) {
      return { ok: false, error: errorMessage(error, 'Não foi possível promover esse usuário.') };
    }
    return { ok: true };
  },

  fetchAllProfiles: async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error || !data) return;
    set({ allProfiles: data.map(rowToProfile) });
  },
}));
