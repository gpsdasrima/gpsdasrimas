import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { rowToChatMessage } from '../lib/mappers';
import type { ChatMessage } from '../types';

interface SendParams {
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
}

export function useBattleChat(battleId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  function addMessage(msg: ChatMessage) {
    if (knownIds.current.has(msg.id)) return;
    knownIds.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }

  useEffect(() => {
    if (!battleId) return;
    let active = true;
    knownIds.current = new Set();
    // Limpa o chat da batalha anterior antes de buscar o da nova — evita
    // mostrar mensagens erradas por um instante ao trocar de batalha.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setMessages([]);

    supabase
      .from('chat_messages')
      .select('*')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (!fetchError && data) {
          const mapped = data.map(rowToChatMessage);
          mapped.forEach((m) => knownIds.current.add(m.id));
          setMessages(mapped);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`chat:${battleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `battle_id=eq.${battleId}` },
        (payload) => addMessage(rowToChatMessage(payload.new as Parameters<typeof rowToChatMessage>[0]))
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `battle_id=eq.${battleId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          knownIds.current.delete(deletedId);
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  async function sendMessage({ userId, userName, userAvatar, message }: SendParams): Promise<boolean> {
    if (!battleId || !message.trim()) return false;
    setSending(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        battle_id: battleId,
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar || null,
        message: message.trim(),
      })
      .select('*')
      .single();
    setSending(false);
    if (insertError || !data) {
      setError(
        insertError?.message?.includes('Aguarde')
          ? insertError.message
          : 'Não foi possível enviar a mensagem.'
      );
      return false;
    }
    addMessage(rowToChatMessage(data));
    return true;
  }

  return { messages, loading, sending, error, sendMessage };
}
