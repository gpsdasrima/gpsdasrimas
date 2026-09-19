import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[GPS DAS RIMAS] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. ' +
      'Copie .env.example para .env, crie um projeto em supabase.com, rode supabase/schema.sql ' +
      'e preencha as variáveis. Veja o README, seção "Configurar o Supabase".'
  );
}

// Em desenvolvimento sem .env configurado, usamos valores vazios para não
// quebrar o build — as chamadas vão falhar com uma mensagem clara em vez
// de a tela inteira ficar em branco.
export const supabase = createClient<Database>(
  supabaseUrl || ' https://czkjwsrwspgvjncesgzh.supabase.co ',
  supabaseAnonKey || 'sb_publishable_5GYeWGhu5gonhlKhmbv7hw_M3l0ERc7'
);
