import type { Database } from './database.types';
import type { AuditLogEntry, Battle, ChatMessage, Favorite, Report, UserProfile } from '../types';

type BattleRow = Database['public']['Tables']['battles']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type FavoriteRow = Database['public']['Tables']['favorites']['Row'];
type ReportRow = Database['public']['Tables']['reports']['Row'];
type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

export function rowToBattle(row: BattleRow): Battle {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    city: row.city,
    state: row.state,
    neighborhood: row.neighborhood,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    date: row.date,
    // O Postgres retorna "HH:MM:SS"; o app trabalha com "HH:MM".
    time: row.time.slice(0, 5),
    dayOfWeek: row.day_of_week,
    frequency: row.frequency,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    instagram: row.instagram ?? undefined,
    tiktok: row.tiktok ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    image: row.image ?? undefined,
    status: row.status,
    editionsCount: row.editions_count,
    rating: row.rating,
    participantsEstimate: row.participants_estimate ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDemo: row.is_demo,
  };
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar_url ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function rowToFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    battleId: row.battle_id,
  };
}

export function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    userId: row.user_id,
    battleId: row.battle_id,
    reason: row.reason,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function rowToChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    battleId: row.battle_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar ?? undefined,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function rowToAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    details: row.details,
    createdAt: row.created_at,
  };
}
