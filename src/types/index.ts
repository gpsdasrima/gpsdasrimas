// Tipos centrais do domínio do GPS DAS RIMAS

export type BattleFrequency = 'semanal' | 'quinzenal' | 'mensal' | 'unico';

export type BattleStatus = 'pendente' | 'aprovada' | 'rejeitada';

export type BattleLiveState = 'ao_vivo' | 'hoje' | 'proxima' | 'encerrada';

export interface Battle {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Data ISO (YYYY-MM-DD) da próxima ocorrência exibida no MVP */
  date: string;
  /** Horário HH:mm */
  time: string;
  dayOfWeek: string;
  frequency: BattleFrequency;
  organizerId: string;
  organizerName: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  image?: string;
  status: BattleStatus;
  editionsCount: number;
  rating: number; // 0-5
  participantsEstimate?: number;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  city?: string;
  state?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  battleId: string;
}

export type ReportReason =
  | 'local_incorreto'
  | 'data_incorreta'
  | 'batalha_nao_existe'
  | 'informacao_falsa'
  | 'outro';

export interface Report {
  id: string;
  userId: string;
  battleId: string;
  reason: ReportReason;
  description?: string;
  status: 'pendente' | 'resolvida';
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface BattleFormData {
  name: string;
  description: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
  time: string;
  dayOfWeek: string;
  frequency: BattleFrequency;
  instagram: string;
  tiktok: string;
  whatsapp: string;
  image: string;
  organizerName: string;
}
