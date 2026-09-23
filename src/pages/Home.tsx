import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { CalendarDays, Flame, Map, MapPin, Star, type LucideIcon } from 'lucide-react';
import { useBattleStore } from '../store/battleStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNow } from '../hooks/useNow';
import { getBattleLiveState } from '../utils/date';
import { distanceKm } from '../utils/geo';
import { BattleCard } from '../components/BattleCard';
import { BattleCardSkeleton } from '../components/BattleCardSkeleton';
import { BRAND } from '../constants/assets';

export function Home() {
  const navigate = useNavigate();
  const { battles } = useBattleStore();
  const now = useNow();
  const geo = useGeolocation();
  const loadingNearby = geo.status === 'loading';

  const approved = useMemo(() => battles.filter((b) => b.status === 'aprovada'), [battles]);

  const withState = useMemo(
    () => approved.map((battle) => ({ battle, state: getBattleLiveState(battle, now) })),
    [approved, now]
  );

  const aoVivo = withState.filter((b) => b.state === 'ao_vivo').slice(0, 4);
  const proximasAll = withState.filter((b) => b.state === 'hoje' || b.state === 'proxima');
  const proximas = [...proximasAll]
    .sort((a, b) => (a.battle.date + a.battle.time).localeCompare(b.battle.date + b.battle.time))
    .slice(0, 4);
  const populares = [...withState].sort((a, b) => b.battle.rating - a.battle.rating).slice(0, 4);

  const pertoDeVoce = useMemo(() => {
    if (!geo.coords) return [];
    return withState
      .map((item) => ({
        ...item,
        distance: distanceKm(geo.coords![0], geo.coords![1], item.battle.latitude, item.battle.longitude),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  }, [geo.coords, withState]);

  const aoVivoCount = withState.filter((b) => b.state === 'ao_vivo').length;
  const popularesCount = withState.filter((b) => b.battle.rating > 0).length;

  function handleFindNearby() {
    geo.request();
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="relative flex h-[420px] items-center overflow-hidden border-b border-ink-700 sm:h-[480px] lg:h-[560px]">
        <img
          src={BRAND.heroBanner}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/75 to-ink-950/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/30 to-transparent" />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl text-center lg:text-left">
            <p className="mb-3 text-sm font-semibold text-signal-yellow">O mapa nacional das batalhas de rima</p>
            <h1 className="font-display text-4xl leading-tight tracking-wide text-chalk-100 sm:text-6xl">
              ENCONTRE SUA
              <br /> PRÓXIMA RIMA.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-chalk-300 lg:mx-0">
              Descubra onde a cena está acontecendo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <button
                onClick={handleFindNearby}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-yellow px-6 py-3.5 text-sm font-bold text-ink-950 shadow-card transition hover:brightness-110 sm:w-auto"
              >
                <MapPin className="h-4 w-4" strokeWidth={2.25} />
                Batalhas perto de mim
              </button>
              <Link
                to="/mapa"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-chalk-100/30 bg-ink-950/40 px-6 py-3.5 text-center text-sm font-bold text-chalk-100 backdrop-blur transition hover:border-gps-blue hover:text-gps-blue sm:w-auto"
              >
                <Map className="h-4 w-4" strokeWidth={2.25} />
                Explorar mapa
              </Link>
            </div>
            {geo.status === 'denied' && (
              <p className="mt-4 text-xs text-signal-red">
                Não conseguimos acessar sua localização. Use a busca por cidade na página Batalhas.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {/* Batalhas em destaque — resumo rápido por categoria */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            icon={Flame}
            label="Ao vivo agora"
            count={aoVivoCount}
            tone="red"
            onClick={() => scrollToSection('ao-vivo')}
          />
          <StatPill
            icon={MapPin}
            label="Perto de você"
            count={geo.coords ? pertoDeVoce.length : null}
            tone="green"
            onClick={geo.coords ? () => scrollToSection('perto-de-voce') : handleFindNearby}
          />
          <StatPill
            icon={CalendarDays}
            label="Próximas batalhas"
            count={proximasAll.length}
            tone="blue"
            onClick={() => scrollToSection('proximas')}
          />
          <StatPill
            icon={Star}
            label="Populares"
            count={popularesCount}
            tone="yellow"
            onClick={() => scrollToSection('populares')}
          />
        </div>

        {geo.coords && (
          <Section id="perto-de-voce" icon={MapPin} title="Perto de você" emptyText="Nenhuma batalha próxima encontrada.">
            {pertoDeVoce.map(({ battle, state, distance }) => (
              <BattleCard key={battle.id} battle={battle} liveState={state} distanceKm={distance} />
            ))}
          </Section>
        )}

        {loadingNearby && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <BattleCardSkeleton key={i} />
            ))}
          </div>
        )}

        <Section id="ao-vivo" icon={Flame} title="Ao vivo agora" emptyText="Nenhuma batalha ao vivo neste momento.">
          {aoVivo.map(({ battle, state }) => (
            <BattleCard key={battle.id} battle={battle} liveState={state} />
          ))}
        </Section>

        <Section id="proximas" icon={CalendarDays} title="Próximas batalhas" emptyText="Nenhuma batalha agendada no momento.">
          {proximas.map(({ battle, state }) => (
            <BattleCard key={battle.id} battle={battle} liveState={state} />
          ))}
        </Section>

        <Section id="populares" icon={Star} title="Batalhas populares" emptyText="Ainda não há avaliações suficientes.">
          {populares.map(({ battle, state }) => (
            <BattleCard key={battle.id} battle={battle} liveState={state} />
          ))}
        </Section>

        <div className="rounded-2xl border border-dashed border-ink-600 p-6 text-center">
          <p className="text-sm text-chalk-300">
            Organiza uma batalha e quer colocá-la no mapa?
          </p>
          <button
            onClick={() => navigate('/cadastrar')}
            className="mt-3 rounded-xl bg-ink-800 px-5 py-2.5 text-sm font-semibold text-chalk-100 hover:bg-ink-700"
          >
            Cadastrar batalha
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  children,
  emptyText,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  emptyText: string;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;

  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="flex items-center gap-2 font-display text-xl tracking-wide text-chalk-100">
        <Icon className="h-5 w-5 text-signal-yellow" strokeWidth={2} />
        {title}
      </h2>
      {hasItems ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      ) : (
        <p className="mt-4 text-sm text-chalk-500">{emptyText}</p>
      )}
    </section>
  );
}

const STAT_TONE_CLASSES: Record<string, string> = {
  red: 'text-signal-red',
  green: 'text-signal-green',
  blue: 'text-gps-blue',
  yellow: 'text-signal-yellow',
};

function StatPill({
  icon: Icon,
  label,
  count,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number | null;
  tone: 'red' | 'green' | 'blue' | 'yellow';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-2xl border border-ink-700 bg-ink-800/50 p-3.5 text-left transition-colors hover:border-ink-500 sm:p-4"
    >
      <span className={`flex items-center gap-1.5 text-xs font-semibold sm:text-sm ${STAT_TONE_CLASSES[tone]}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        {label}
      </span>
      <span className="font-display text-lg text-chalk-100">
        {count === null ? '—' : count}
        {count !== null && (
          <span className="ml-1 font-body text-xs font-normal text-chalk-500">
            {count === 1 ? 'batalha' : 'batalhas'}
          </span>
        )}
      </span>
    </button>
  );
}
