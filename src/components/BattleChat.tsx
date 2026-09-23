import { useEffect, useRef, useState } from 'react';
import { Crown, Loader2, MessageCircle, Send } from 'lucide-react';
import { useBattleChat } from '../hooks/useBattleChat';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { MaskIcon } from './MaskIcon';
import { ICONS } from '../constants/assets';

const MAX_LENGTH = 500;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function BattleChat({ battleId, organizerId }: { battleId: string; organizerId: string }) {
  const { currentUser } = useAuthStore();
  const { messages, loading, sending, error, sendMessage } = useBattleChat(battleId);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (error) push({ type: 'error', title: 'Não foi possível enviar', description: error });
  }, [error, push]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !text.trim()) return;
    const ok = await sendMessage({
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      message: text,
    });
    if (ok) setText('');
  }

  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-lg text-chalk-100">
        <MessageCircle className="h-4 w-4 text-signal-yellow" strokeWidth={2} />
        Chat da batalha
      </h2>

      <div className="mt-3 rounded-2xl border border-ink-700 bg-ink-800/40">
        <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-chalk-500" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-chalk-500">
              Ninguém falou nada ainda — manda o primeiro salve!
            </p>
          ) : (
            messages.map((m) => {
              const isCreator = m.userId === organizerId;
              return (
                <div key={m.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink-600 bg-ink-800">
                    {m.userAvatar ? (
                      <img src={m.userAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MaskIcon src={ICONS.profile} className="h-4 w-4 text-chalk-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-chalk-100">{m.userName}</span>
                      {isCreator && (
                        <span className="flex items-center gap-0.5 rounded-full bg-signal-yellow/15 px-1.5 py-0.5 text-[10px] font-bold text-signal-yellow">
                          <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
                          Criador
                        </span>
                      )}
                      <span className="text-[10px] text-chalk-600">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 break-words text-sm text-chalk-300">{m.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-ink-700 p-3">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Escreva uma mensagem..."
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-xl border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-chalk-100 placeholder:text-chalk-500 focus:border-signal-yellow focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-yellow text-ink-950 disabled:opacity-50"
                aria-label="Enviar mensagem"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.25} />}
              </button>
            </form>
          ) : (
            <p className="text-center text-xs text-chalk-500">Entre na sua conta para participar do chat.</p>
          )}
        </div>
      </div>
    </section>
  );
}
