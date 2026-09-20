import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { rowToBattle, rowToFavorite, rowToReport } from '../lib/mappers';
import type { Database } from '../lib/database.types';
import type { Battle, BattleFormData, Favorite, Report, ReportReason } from '../types';
import { slugify } from '../utils/slugify';

interface BattleState {
  battles: Battle[];
  favorites: Favorite[];
  reports: Report[];
  loading: boolean;
  error: string | null;

  /** Busca as batalhas visíveis (aprovadas para todos; pendentes/rejeitadas próprias ou se for admin). */
  fetchBattles: () => Promise<void>;
  /** Busca os favoritos do usuário logado (o RLS já restringe às linhas dele). */
  fetchFavorites: () => Promise<void>;
  /** Busca denúncias visíveis (próprias, ou todas se for admin). */
  fetchReports: () => Promise<void>;

  addBattle: (data: BattleFormData, userId: string, userName: string) => Promise<Battle | null>;
  updateBattle: (id: string, data: Partial<BattleFormData>) => Promise<boolean>;
  removeBattle: (id: string) => Promise<boolean>;
  setStatus: (id: string, status: Battle['status']) => Promise<boolean>;

  toggleFavorite: (userId: string, battleId: string) => Promise<void>;
  isFavorite: (userId: string, battleId: string) => boolean;
  favoritesForUser: (userId: string) => Battle[];

  addReport: (
    userId: string,
    battleId: string,
    reason: ReportReason,
    description?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  resolveReport: (id: string) => Promise<boolean>;

  battlesByOrganizer: (userId: string) => Battle[];

  clearLocalUserData: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  battles: [],
  favorites: [],
  reports: [],
  loading: false,
  error: null,

  fetchBattles: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.from('battles').select('*').order('date', { ascending: true });
    if (error) {
      set({ loading: false, error: errorMessage(error, 'Não foi possível carregar as batalhas.') });
      return;
    }
    set({ battles: (data ?? []).map(rowToBattle), loading: false });
  },

  fetchFavorites: async () => {
    const { data, error } = await supabase.from('favorites').select('*');
    if (error) {
      set({ error: errorMessage(error, 'Não foi possível carregar seus favoritos.') });
      return;
    }
    set({ favorites: (data ?? []).map(rowToFavorite) });
  },

  fetchReports: async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (error) {
      set({ error: errorMessage(error, 'Não foi possível carregar as denúncias.') });
      return;
    }
    set({ reports: (data ?? []).map(rowToReport) });
  },

  addBattle: async (data, userId, userName) => {
    const baseSlug = slugify(data.name) || `batalha-${Date.now()}`;
    const existingSlugs = new Set(get().battles.map((b) => b.slug));
    let slug = baseSlug;
    let counter = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const { data: row, error } = await supabase
      .from('battles')
      .insert({
        slug,
        name: data.name,
        description: data.description,
        city: data.city,
        state: data.state,
        neighborhood: data.neighborhood,
        address: data.address,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        date: data.date,
        time: data.time,
        day_of_week: data.dayOfWeek,
        frequency: data.frequency,
        organizer_id: userId,
        organizer_name: data.organizerName || userName,
        instagram: data.instagram || null,
        tiktok: data.tiktok || null,
        whatsapp: data.whatsapp || null,
        image: data.image || null,
      })
      .select('*')
      .single();

    if (error || !row) {
      set({ error: errorMessage(error, 'Não foi possível cadastrar a batalha.') });
      return null;
    }

    const battle = rowToBattle(row);
    set((s) => ({ battles: [battle, ...s.battles] }));
    return battle;
  },

  updateBattle: async (id, data) => {
    const patch: Database['public']['Tables']['battles']['Update'] = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.city !== undefined) patch.city = data.city;
    if (data.state !== undefined) patch.state = data.state;
    if (data.neighborhood !== undefined) patch.neighborhood = data.neighborhood;
    if (data.address !== undefined) patch.address = data.address;
    if (data.latitude !== undefined && data.latitude !== null) patch.latitude = data.latitude;
    if (data.longitude !== undefined && data.longitude !== null) patch.longitude = data.longitude;
    if (data.date !== undefined) patch.date = data.date;
    if (data.time !== undefined) patch.time = data.time;
    if (data.dayOfWeek !== undefined) patch.day_of_week = data.dayOfWeek;
    if (data.frequency !== undefined) patch.frequency = data.frequency;
    if (data.organizerName !== undefined) patch.organizer_name = data.organizerName;
    if (data.instagram !== undefined) patch.instagram = data.instagram || null;
    if (data.tiktok !== undefined) patch.tiktok = data.tiktok || null;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp || null;
    if (data.image !== undefined) patch.image = data.image || null;

    const { data: row, error } = await supabase.from('battles').update(patch).eq('id', id).select('*').single();
    if (error || !row) {
      set({ error: errorMessage(error, 'Não foi possível salvar as alterações.') });
      return false;
    }
    const battle = rowToBattle(row);
    set((s) => ({ battles: s.battles.map((b) => (b.id === id ? battle : b)) }));
    return true;
  },

  removeBattle: async (id) => {
    const { error } = await supabase.from('battles').delete().eq('id', id);
    if (error) {
      set({ error: errorMessage(error, 'Não foi possível remover a batalha.') });
      return false;
    }
    set((s) => ({
      battles: s.battles.filter((b) => b.id !== id),
      favorites: s.favorites.filter((f) => f.battleId !== id),
    }));
    return true;
  },

  setStatus: async (id, status) => {
    const { data: row, error } = await supabase.from('battles').update({ status }).eq('id', id).select('*').single();
    if (error || !row) {
      set({ error: errorMessage(error, 'Não foi possível atualizar o status da batalha.') });
      return false;
    }
    const battle = rowToBattle(row);
    set((s) => ({ battles: s.battles.map((b) => (b.id === id ? battle : b)) }));
    return true;
  },

  toggleFavorite: async (userId, battleId) => {
    const exists = get().favorites.find((f) => f.userId === userId && f.battleId === battleId);

    if (exists) {
      // Otimista: remove local antes da resposta do servidor pra UI responder na hora.
      set((s) => ({ favorites: s.favorites.filter((f) => f.id !== exists.id) }));
      const { error } = await supabase.from('favorites').delete().eq('id', exists.id);
      if (error) {
        // desfaz caso o servidor recuse
        set((s) => ({ favorites: [...s.favorites, exists] }));
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Favorite = { id: tempId, userId, battleId };
    set((s) => ({ favorites: [...s.favorites, optimistic] }));

    const { data: row, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, battle_id: battleId })
      .select('*')
      .single();

    if (error || !row) {
      set((s) => ({ favorites: s.favorites.filter((f) => f.id !== tempId) }));
      return;
    }
    const favorite = rowToFavorite(row);
    set((s) => ({ favorites: s.favorites.map((f) => (f.id === tempId ? favorite : f)) }));
  },

  isFavorite: (userId, battleId) => get().favorites.some((f) => f.userId === userId && f.battleId === battleId),

  favoritesForUser: (userId) => {
    const favIds = new Set(get().favorites.filter((f) => f.userId === userId).map((f) => f.battleId));
    return get().battles.filter((b) => favIds.has(b.id));
  },

  addReport: async (userId, battleId, reason, description) => {
    const { data: row, error } = await supabase
      .from('reports')
      .insert({ user_id: userId, battle_id: battleId, reason, description: description || null })
      .select('*')
      .single();
    if (error || !row) {
      // 23505 = violação de índice único — nesse caso é a trava antiabuso
      // (uma denúncia em aberto por pessoa/batalha) definida no schema.
      if (error?.code === '23505') {
        return { ok: false, error: 'Você já tem uma denúncia em aberto para essa batalha. Aguarde a moderação avaliar.' };
      }
      const message = errorMessage(error, 'Não foi possível enviar a denúncia.');
      set({ error: message });
      return { ok: false, error: message };
    }
    set((s) => ({ reports: [rowToReport(row), ...s.reports] }));
    return { ok: true };
  },

  resolveReport: async (id) => {
    const { data: row, error } = await supabase
      .from('reports')
      .update({ status: 'resolvida' })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !row) {
      set({ error: errorMessage(error, 'Não foi possível resolver a denúncia.') });
      return false;
    }
    const report = rowToReport(row);
    set((s) => ({ reports: s.reports.map((r) => (r.id === id ? report : r)) }));
    return true;
  },

  battlesByOrganizer: (userId) => get().battles.filter((b) => b.organizerId === userId),

  /** Limpa dados específicos do usuário (favoritos) ao fazer logout, mantendo o cache de batalhas. */
  clearLocalUserData: () => set({ favorites: [] }),
}));
