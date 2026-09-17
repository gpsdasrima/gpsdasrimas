import { supabase } from './supabaseClient';

export type StorageBucket = 'avatars' | 'battle-images';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function slugifyFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : 'jpg';
  return `${Date.now()}.${ext.replace(/[^a-z0-9]/g, '') || 'jpg'}`;
}

/**
 * Envia uma imagem (tirada na hora ou escolhida da galeria/arquivo) para o
 * Supabase Storage e retorna a URL pública para salvar no banco.
 * O caminho sempre começa com o id do usuário, exigido pelas políticas de
 * RLS do bucket (ver supabase/schema.sql).
 */
export async function uploadImage(bucket: StorageBucket, userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem (JPG, PNG ou WEBP).');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('A imagem precisa ter até 5 MB.');
  }

  const path = `${userId}/${slugifyFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
  });
  if (error) {
    throw new Error(error.message || 'Não foi possível enviar a imagem.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
