import { useMemo, useState } from 'react';
import { useBattleStore } from '../store/battleStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNow } from '../hooks/useNow';
import { getBattleLiveState, isSameDay, toDateTime } from '../utils/date';
import { distanceKm } from '../utils/geo';
import { SearchBar } from '../components/SearchBar';
import { BattleCard } from '../components/BattleCard';

type TypeFilter = 'todas' | 'ao_vivo' | 'hoje' | 'proximas' | 'gratuitas';
type SortBy = 'data_mais_proxima' | 'mais_proximas' | 'mais_populares';

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'ao_vivo', label: '🔴 Ao vivo' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'gratuitas', label: 'Gratuitas' },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'data_mais_proxima', label: 'Data mais próxima' },
  { key: 'mais_proximas', label: 'Mais próximas' },
  { key: 'mais_populares', label: 'Mais populares' },
];

export function BattlesList() {
  const { battles } = useBattleStore();
  const now = useNow();
  const geo = useGeolocation();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas');
  const [sortBy, setSortBy] = useState<SortBy>('data_mais_proxima');

  const approved = useMemo(() => battles.filter((b) => b.status === 'aprovada'), [battles]);

  const searched = useMemo(() => {
    if (!query.trim()) return approved;
    const q = query.toLowerCase();
    return approved.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.neighborhood.toLowerCase().includes(q) ||
        b.state.toLowerCase().includes(q)
    );
  }, [approved, query]);

  const withMeta = useMemo(
    () =>
      searched.map((battle) => {
        const state = getBattleLiveState(battle, now);
        const distance = geo.coords
          ? distanceKm(geo.coords[0], geo.coords[1], battle.latitude, battle.longitude)
          : null;
        return { battle, state, distance };
      }),
    [searched, now, geo.coords]
  );

  const filteredList = useMemo(() => {
    let list = withMeta;
    if (typeFilter === 'ao_vivo') list = list.filter((i) => i.state === 'ao_vivo');
    if (typeFilter === 'hoje')
      list = list.filter((i) => isSameDay(toDateTime(i.battle.date, i.battle.time), now));
    if (typeFilter === 'proximas')
      list = list.filter((i) => i.state === 'proxima' || i.state === 'hoje');
    // MVP: todas as batalhas cadastradas são gratuitas por padrão,
    // então "Gratuitas" não precisa reduzir a lista aqui — mantido por
    // paridade com o design, pronto para quando houver eventos pagos.

    if (sortBy === 'mais_proximas' && geo.coords) {
      list = [...list].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else if (sortBy === 'mais_populares') {
      list = [...list].sort((a, b) => b.battle.rating - a.battle.rating);
    } else {
      list = [...list].sort(
        (a, b) => (a.battle.date + a.battle.time).localeCompare(b.battle.date + b.battle.time)
      );
    }
    return list;
  }, [withMeta, typeFilter, sortBy, geo.coords, now]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="font-display text-2xl tracking-wide text-chalk-100">Batalhas</h1>
      <p className="mt-1 text-sm text-chalk-300">Pesquise por cidade, bairro ou nome da batalha.</p>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {/* Chips de filtro rápido — visível em qualquer largura de tela */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none]">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTypeFilter(opt.key)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              typeFilter === opt.key
                ? 'border-signal-yellow bg-signal-yellow/15 text-signal-yellow'
                : 'border-ink-600 text-chalk-300 hover:border-ink-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {sortBy === 'mais_proximas' && !geo.coords && (
        <button
          onClick={() => geo.request()}
          className="mt-2 text-xs font-semibold text-gps-blue underline"
        >
          Ative sua localização para ordenar por proximidade
        </button>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          {filteredList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center">
              <p className="text-3xl">🔍</p>
              <p className="mt-2 text-sm text-chalk-300">Nenhuma batalha encontrada com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredList.map(({ battle, state, distance }) => (
                <BattleCard key={battle.id} battle={battle} liveState={state} distanceKm={distance} />
              ))}
            </div>
          )}
        </div>

        {/* Barra lateral de filtros — só no desktop, espelha os chips acima */}
        <aside className="hidden h-fit space-y-6 rounded-2xl border border-ink-700 bg-ink-800/50 p-5 lg:block">
          <div>
            <h3 className="font-display text-sm tracking-wide text-chalk-100">Filtros</h3>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-chalk-500">Tipo de batalha</p>
            <div className="mt-2 space-y-1.5">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-chalk-300"
                >
                  <input
                    type="radio"
                    name="tipo"
                    checked={typeFilter === opt.key}
                    onChange={() => setTypeFilter(opt.key)}
                    className="accent-signal-yellow"
                  />
                  <span className={typeFilter === opt.key ? 'font-semibold text-chalk-100' : ''}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-chalk-500">Ordenar por</p>
            <div className="mt-2 space-y-1.5">
              {SORT_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-chalk-300"
                >
                  <input
                    type="radio"
                    name="ordenar"
                    checked={sortBy === opt.key}
                    onChange={() => setSortBy(opt.key)}
                    className="accent-signal-yellow"
                  />
                  <span className={sortBy === opt.key ? 'font-semibold text-chalk-100' : ''}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
