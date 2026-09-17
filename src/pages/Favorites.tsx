import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { useNow } from '../hooks/useNow';
import { getBattleLiveState } from '../utils/date';
import { BattleCard } from '../components/BattleCard';
import { BRAND } from '../constants/assets';

export function Favorites() {
  const { currentUser } = useAuthStore();
  const { favoritesForUser } = useBattleStore();
  const now = useNow();

  if (!currentUser) return null;

  const favorites = favoritesForUser(currentUser.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl tracking-wide text-chalk-100">Minhas batalhas</h1>
      <p className="mt-1 text-sm text-chalk-300">Suas batalhas favoritas, todas num lugar só.</p>

      {favorites.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink-600 p-8 text-center">
          <img src={BRAND.mascot} alt="" className="mx-auto h-32 object-contain opacity-90" />
          <p className="mt-2 text-sm text-chalk-300">Você ainda não favoritou nenhuma batalha.</p>
          <Link
            to="/batalhas"
            className="mt-4 inline-block rounded-xl bg-ink-800 px-5 py-2.5 text-sm font-semibold text-chalk-100"
          >
            Explorar batalhas
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((b) => (
            <BattleCard key={b.id} battle={b} liveState={getBattleLiveState(b, now)} />
          ))}
        </div>
      )}
    </div>
  );
}
