import { Link } from 'react-router-dom';
import type { Battle } from '../types';
import { StatusBadge } from './StatusBadge';
import { MaskIcon } from './MaskIcon';
import { formatDateBR } from '../utils/date';
import { formatDistance } from '../utils/geo';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { useToastStore } from '../store/toastStore';
import { BRAND, ICONS } from '../constants/assets';

interface Props {
  battle: Battle;
  liveState: ReturnType<typeof import('../utils/date').getBattleLiveState>;
  distanceKm?: number | null;
}

export function BattleCard({ battle, liveState, distanceKm }: Props) {
  const { currentUser } = useAuthStore();
  const { toggleFavorite, isFavorite } = useBattleStore();
  const push = useToastStore((s) => s.push);
  const favorited = currentUser ? isFavorite(currentUser.id, battle.id) : false;

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!currentUser) {
      push({ type: 'info', title: 'Entre na sua conta', description: 'Faça login para favoritar batalhas.' });
      return;
    }
    const wasFavorited = favorited;
    await toggleFavorite(currentUser.id, battle.id);
    push({
      type: 'success',
      title: wasFavorited ? 'Removida dos favoritos' : 'Adicionada aos favoritos ⭐',
    });
  }

  return (
    <Link
      to={`/batalha/${battle.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/60 shadow-card transition-transform hover:-translate-y-0.5 hover:border-signal-yellow/50"
    >
      <div className="relative h-32 w-full overflow-hidden bg-ink-700">
        {battle.image ? (
          <img
            src={battle.image}
            alt={battle.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <img src={BRAND.mascot} alt="" className="h-full object-contain opacity-90" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge state={liveState} />
        </div>
        <button
          onClick={handleFavorite}
          aria-label="Favoritar batalha"
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/70 backdrop-blur transition-transform hover:scale-110 ${
            favorited ? 'text-signal-yellow' : 'text-chalk-300'
          }`}
        >
          <MaskIcon src={ICONS.favorite} className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-display text-base tracking-wide text-chalk-100">{battle.name}</h3>
        <p className="text-sm text-chalk-300">
          📍 {battle.neighborhood}, {battle.city} - {battle.state}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-chalk-500">
          <span>📅 {formatDateBR(battle.date)}</span>
          <span>⏰ {battle.time}</span>
          {typeof distanceKm === 'number' && (
            <span className="font-semibold text-gps-blue">{formatDistance(distanceKm)}</span>
          )}
        </div>
        {battle.isDemo && (
          <span className="mt-1 w-fit rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-chalk-500">
            Exemplo demonstrativo
          </span>
        )}
      </div>
    </Link>
  );
}
