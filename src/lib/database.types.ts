/**
 * Tipos do banco de dados Supabase. Escritos manualmente para casar com
 * `supabase/schema.sql`. Se você alterar o schema, gere tipos oficiais com:
 *   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/lib/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          city: string | null;
          state: string | null;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          city?: string | null;
          state?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      battles: {
        Row: {
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
          date: string;
          time: string;
          day_of_week: string;
          frequency: 'semanal' | 'quinzenal' | 'mensal' | 'unico';
          organizer_id: string;
          organizer_name: string;
          instagram: string | null;
          tiktok: string | null;
          whatsapp: string | null;
          image: string | null;
          status: 'pendente' | 'aprovada' | 'rejeitada';
          editions_count: number;
          rating: number;
          participants_estimate: number | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          city: string;
          state: string;
          neighborhood: string;
          address: string;
          latitude: number;
          longitude: number;
          date: string;
          time: string;
          day_of_week: string;
          frequency: 'semanal' | 'quinzenal' | 'mensal' | 'unico';
          organizer_id: string;
          organizer_name: string;
          instagram?: string | null;
          tiktok?: string | null;
          whatsapp?: string | null;
          image?: string | null;
          status?: 'pendente' | 'aprovada' | 'rejeitada';
          editions_count?: number;
          rating?: number;
          participants_estimate?: number | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['battles']['Insert']>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          battle_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          battle_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          battle_id: string;
          reason: 'local_incorreto' | 'data_incorreta' | 'batalha_nao_existe' | 'informacao_falsa' | 'outro';
          description: string | null;
          status: 'pendente' | 'resolvida';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          battle_id: string;
          reason: 'local_incorreto' | 'data_incorreta' | 'batalha_nao_existe' | 'informacao_falsa' | 'outro';
          description?: string | null;
          status?: 'pendente' | 'resolvida';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          target_label: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          target_label?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          battle_id: string;
          user_id: string;
          user_name: string;
          user_avatar: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          user_id: string;
          user_name: string;
          user_avatar?: string | null;
          message: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      promote_to_admin: {
        Args: { target_email: string };
        Returns: undefined;
      };
      log_admin_action: {
        Args: {
          p_action: string;
          p_target_type: string;
          p_target_id: string | null;
          p_target_label: string | null;
          p_details?: Record<string, unknown> | null;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
