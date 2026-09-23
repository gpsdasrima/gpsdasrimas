import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Compass,
  Loader2,
  Locate,
  Maximize2,
  Minimize2,
  Navigation,
  Users,
  X,
} from 'lucide-react';
import { useBattleStore } from '../store/battleStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRoute } from '../hooks/useRoute';
import { useNow } from '../hooks/useNow';
import { useToastStore } from '../store/toastStore';
import { getBattleLiveState } from '../utils/date';
import { distanceKm, formatDistance } from '../utils/geo';
import { advanceStepIndex } from '../utils/routing';
import { BattleMap } from '../components/BattleMap';
import { StatusBadge } from '../components/StatusBadge';
import { SearchBar } from '../components/SearchBar';
import { RouteInfoPanel } from '../components/RouteInfoPanel';
import { TurnByTurnPanel } from '../components/TurnByTurnPanel';
import type { Battle } from '../types';

const BRASIL_CENTER: [number, number] = [-14.235, -51.9253];
const ARRIVAL_THRESHOLD_M = 30;

export function MapPage() {
  const navigate = useNavigate();
  const { battles } = useBattleStore();
  const now = useNow();
  const geo = useGeolocation();
  const routing = useRoute();
  const push = useToastStore((s) => s.push);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Battle | null>(null);
  const [manualCity, setManualCity] = useState('');
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [manualOrigin, setManualOrigin] = useState<[number, number] | null>(null);
  const [liveNav, setLiveNav] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const origin = manualOrigin ?? geo.coords;
  const isLiveLocation = geo.watching && !manualOrigin;

  const approved = useMemo(() => battles.filter((b) => b.status === 'aprovada'), [battles]);

  const filtered = useMemo(() => {
    if (!query.trim()) return approved;
    const q = query.toLowerCase();
    return approved.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.neighborhood.toLowerCase().includes(q)
    );
  }, [approved, query]);

  const withState = useMemo(
    () => filtered.map((battle) => ({ battle, state: getBattleLiveState(battle, now) })),
    [filtered, now]
  );

  const center: [number, number] = useMemo(() => {
    if (liveNav && origin) return origin;
    if (routing.data && routing.data.coordinates.length > 1) {
      // o próprio FitRoute do mapa cuida do enquadramento; mantém o centro atual como referência
      return selected ? [selected.latitude, selected.longitude] : BRASIL_CENTER;
    }
    if (selected) return [selected.latitude, selected.longitude];
    if (origin) return origin;
    if (withState.length === 1) return [withState[0].battle.latitude, withState[0].battle.longitude];
    return BRASIL_CENTER;
  }, [liveNav, selected, origin, withState, routing.data]);

  const zoom = liveNav ? 17 : origin || selected ? 13 : withState.length > 0 ? 4.5 : 4;

  // Trava o scroll do fundo da página enquanto o mapa está em tela cheia.
  useEffect(() => {
    if (fullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [fullscreen]);

  function handleManualCitySearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(manualCity);
  }

  function stopLiveNav() {
    setLiveNav(false);
    setCurrentStepIndex(0);
  }

  function handleSelect(battle: Battle) {
    setSelected(battle);
    setPickingOrigin(false);
    stopLiveNav();
    // Se já sabemos onde a pessoa está, traça a rota na hora — sem
    // precisar de mais um toque em "Traçar rota".
    if (origin) {
      routing.calculate(origin, [battle.latitude, battle.longitude]);
    } else {
      routing.clear();
    }
  }

  function handleTraceRoute() {
    if (!selected) return;
    if (origin) {
      routing.calculate(origin, [selected.latitude, selected.longitude]);
    } else {
      setPickingOrigin(true);
    }
  }

  function handlePickLocation(coords: [number, number]) {
    if (!pickingOrigin || !selected) return;
    setManualOrigin(coords);
    setPickingOrigin(false);
    routing.calculate(coords, [selected.latitude, selected.longitude]);
  }

  function handleToggleLiveNav() {
    if (liveNav) {
      stopLiveNav();
      return;
    }
    if (!routing.data) return;
    setCurrentStepIndex(0);
    setLiveNav(true);
    if (!geo.watching) geo.startWatching();
  }

  // Botão "minha localização": liga o rastreamento contínuo (tempo real),
  // não só uma leitura única — assim a bolinha azul se move com a pessoa
  // enquanto ela estiver com o mapa aberto.
  function handleEnableLiveLocation() {
    setManualOrigin(null);
    geo.startWatching();
  }

  // Se a localização automática chegar enquanto o usuário está esperando marcar manualmente, usa ela.
  useEffect(() => {
    if (pickingOrigin && geo.coords && selected) {
      setPickingOrigin(false);
      routing.calculate(geo.coords, [selected.latitude, selected.longitude]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords]);

  // Modo navegação ao vivo: a cada atualização de posição, avança a
  // instrução atual e detecta chegada ao destino.
  useEffect(() => {
    if (!liveNav || !geo.coords || !routing.data || !selected) return;
    setCurrentStepIndex((idx) => advanceStepIndex(geo.coords!, routing.data!.steps, idx));

    const distanceToDestM =
      distanceKm(geo.coords[0], geo.coords[1], selected.latitude, selected.longitude) * 1000;
    if (distanceToDestM < ARRIVAL_THRESHOLD_M) {
      stopLiveNav();
      push({ type: 'success', title: 'Você chegou!', description: selected.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords, liveNav]);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[600] flex flex-col bg-ink-950'
          : 'flex h-[calc(100dvh-4rem-4.25rem)] flex-col md:h-[calc(100dvh-4rem)]'
      }
    >
      {!fullscreen && (
        <div className="border-b border-ink-700 bg-ink-950 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar value={query} onChange={setQuery} placeholder="Buscar batalha, cidade ou bairro..." />
            </div>
            <button
              onClick={handleEnableLiveLocation}
              disabled={geo.status === 'loading'}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-signal-yellow px-4 py-3 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
            >
              {geo.status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLiveLocation ? (
                <Locate className="h-4 w-4" />
              ) : (
                <Compass className="h-4 w-4" />
              )}
              {geo.status === 'loading' ? 'Localizando...' : isLiveLocation ? 'Ao vivo' : 'Minha localização'}
            </button>
          </div>
          {(geo.status === 'denied' || geo.status === 'timeout') && (
            <form onSubmit={handleManualCitySearch} className="mx-auto mt-2 flex max-w-7xl gap-2">
              <input
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Não deu pra usar sua localização — digite sua cidade"
                className="flex-1 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-chalk-100 placeholder:text-chalk-500 focus:border-signal-yellow focus:outline-none"
              />
              <button className="rounded-xl border border-ink-600 px-3 py-2 text-sm text-chalk-100">
                Buscar
              </button>
            </form>
          )}
        </div>
      )}

      <div className="relative flex-1">
        <BattleMap
          battles={withState}
          center={center}
          zoom={zoom}
          userLocation={origin}
          userAccuracy={manualOrigin ? null : geo.accuracy}
          userHeading={manualOrigin ? null : geo.heading}
          userLive={isLiveLocation}
          route={routing.data?.coordinates}
          followUser={liveNav}
          onSelectBattle={handleSelect}
          pickable={pickingOrigin}
          onPickLocation={handlePickLocation}
        />

        {/* Busca flutuante compacta, só aparece em tela cheia */}
        {fullscreen && !liveNav && (
          <div className="absolute inset-x-3 top-3 z-[500] mx-auto max-w-md">
            <SearchBar value={query} onChange={setQuery} placeholder="Buscar batalha, cidade ou bairro..." />
          </div>
        )}

        {/* Controles flutuantes: tela cheia + localizar */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
          {!fullscreen && (
            <MapControlButton
              label={geo.status === 'loading' ? 'Localizando...' : 'Minha localização'}
              icon={geo.status === 'loading' ? Loader2 : isLiveLocation ? Locate : Compass}
              spin={geo.status === 'loading'}
              active={isLiveLocation}
              onClick={handleEnableLiveLocation}
              disabled={geo.status === 'loading'}
            />
          )}
          <MapControlButton
            label={fullscreen ? 'Sair da tela cheia' : 'Ver mapa em tela cheia'}
            icon={fullscreen ? Minimize2 : Maximize2}
            onClick={() => setFullscreen((v) => !v)}
          />
        </div>

        {pickingOrigin && (
          <div className="absolute inset-x-3 top-16 z-[500] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-xl border border-signal-yellow bg-ink-900/95 px-4 py-3 text-center text-sm font-semibold text-signal-yellow shadow-card backdrop-blur">
            <Navigation className="h-4 w-4 shrink-0" />
            Toque no mapa para marcar de onde você está saindo
          </div>
        )}

        {selected && (
          <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-col gap-2 sm:left-3 sm:right-auto sm:w-80">
            {routing.status !== 'idle' && (
              <RouteInfoPanel
                route={routing.data}
                loading={routing.status === 'loading'}
                error={routing.error}
                destination={[selected.latitude, selected.longitude]}
                origin={origin}
                onRetry={handleTraceRoute}
              />
            )}
            {routing.data && routing.data.steps.length > 0 && (
              <TurnByTurnPanel
                steps={routing.data.steps}
                currentIndex={currentStepIndex}
                live={liveNav}
                onToggleLive={handleToggleLiveNav}
              />
            )}
            {!liveNav && (
              <SelectedBattleCard
                battle={selected}
                state={getBattleLiveState(selected, now)}
                distance={origin ? distanceKm(origin[0], origin[1], selected.latitude, selected.longitude) : null}
                onClose={() => {
                  setSelected(null);
                  routing.clear();
                  setPickingOrigin(false);
                  stopLiveNav();
                }}
                onView={() => navigate(`/batalha/${selected.slug}`)}
                onTraceRoute={handleTraceRoute}
                routing={routing.status === 'loading'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MapControlButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  spin,
}: {
  icon: typeof Compass;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-card backdrop-blur transition-colors disabled:opacity-60 ${
        active
          ? 'border-gps-blue bg-gps-blue/20 text-gps-blue'
          : 'border-ink-600 bg-ink-800/95 text-chalk-100 hover:border-signal-yellow'
      }`}
    >
      <Icon className={`h-5 w-5 ${spin ? 'animate-spin' : ''}`} strokeWidth={2} />
    </button>
  );
}

function SelectedBattleCard({
  battle,
  state,
  distance,
  onClose,
  onView,
  onTraceRoute,
  routing,
}: {
  battle: Battle;
  state: ReturnType<typeof getBattleLiveState>;
  distance: number | null;
  onClose: () => void;
  onView: () => void;
  onTraceRoute: () => void;
  routing: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800/95 p-4 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base tracking-wide text-chalk-100">{battle.name}</h3>
          <p className="mt-0.5 text-xs text-chalk-300">
            {battle.neighborhood}, {battle.city} - {battle.state}
          </p>
        </div>
        <button onClick={onClose} className="text-chalk-500 hover:text-chalk-100" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge state={state} />
        {distance !== null && (
          <span className="text-xs font-semibold text-gps-blue">{formatDistance(distance)}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-chalk-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> {battle.date.split('-').reverse().join('/')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {battle.time}
        </span>
        {battle.participantsEstimate && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> ~{battle.participantsEstimate} pessoas
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onTraceRoute}
          disabled={routing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gps-blue py-2.5 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
        >
          {routing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          {routing ? 'Calculando...' : 'Traçar rota'}
        </button>
        <button
          onClick={onView}
          className="flex-1 rounded-xl bg-signal-yellow py-2.5 text-sm font-bold text-ink-950 hover:brightness-110"
        >
          Ver batalha
        </button>
      </div>
    </div>
  );
}
