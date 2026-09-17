import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useNow } from '../hooks/useNow';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRoute } from '../hooks/useRoute';
import { getBattleLiveState, formatDateBR, frequencyLabel } from '../utils/date';
import { distanceKm } from '../utils/geo';
import { advanceStepIndex } from '../utils/routing';
import { StatusBadge } from '../components/StatusBadge';
import { BattleMap } from '../components/BattleMap';
import { BattleCard } from '../components/BattleCard';
import { RouteInfoPanel } from '../components/RouteInfoPanel';
import { TurnByTurnPanel } from '../components/TurnByTurnPanel';
import { MaskIcon } from '../components/MaskIcon';
import { BRAND, ICONS } from '../constants/assets';
import type { ReportReason } from '../types';

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'local_incorreto', label: 'Local incorreto' },
  { key: 'data_incorreta', label: 'Data incorreta' },
  { key: 'batalha_nao_existe', label: 'Batalha não existe' },
  { key: 'informacao_falsa', label: 'Informação falsa' },
  { key: 'outro', label: 'Outro' },
];

export function BattleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const now = useNow();
  const { battles, toggleFavorite, isFavorite, addReport } = useBattleStore();
  const { currentUser } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const geo = useGeolocation();
  const routing = useRoute();
  const [reportOpen, setReportOpen] = useState(false);
  const [wantsDirections, setWantsDirections] = useState(false);
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [manualOrigin, setManualOrigin] = useState<[number, number] | null>(null);
  const [liveNav, setLiveNav] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const battle = useMemo(() => battles.find((b) => b.slug === slug), [battles, slug]);
  const destinationCoords: [number, number] | null = battle ? [battle.latitude, battle.longitude] : null;
  const origin = manualOrigin ?? geo.coords;

  // Assim que a localização automática chega (depois de clicar em "Como chegar"),
  // calcula a rota real sem precisar de mais um clique. Precisa ficar antes do
  // guard de "batalha não encontrada" para respeitar a regra dos Hooks (ordem
  // estável entre renderizações).
  useEffect(() => {
    if (wantsDirections && geo.coords && !manualOrigin && destinationCoords) {
      routing.calculate(geo.coords, destinationCoords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords, wantsDirections, destinationCoords]);

  // Modo navegação ao vivo: a cada atualização de posição, avança a
  // instrução atual e detecta chegada ao destino. Fica antes do guard por
  // causa da regra dos Hooks.
  useEffect(() => {
    if (!liveNav || !geo.coords || !routing.data || !destinationCoords) return;
    setCurrentStepIndex((idx) => advanceStepIndex(geo.coords!, routing.data!.steps, idx));

    const distanceToDestM =
      distanceKm(geo.coords[0], geo.coords[1], destinationCoords[0], destinationCoords[1]) * 1000;
    if (distanceToDestM < 30) {
      geo.stopWatching();
      setLiveNav(false);
      setCurrentStepIndex(0);
      push({ type: 'success', title: '🎉 Você chegou!' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.coords, liveNav, destinationCoords]);

  const related = useMemo(() => {
    if (!battle) return [];
    return battles
      .filter((b) => b.id !== battle.id && b.city === battle.city && b.status === 'aprovada')
      .slice(0, 3);
  }, [battles, battle]);

  if (!battle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <img src={BRAND.mascot} alt="" className="mx-auto h-40 object-contain opacity-90" />
        <h1 className="mt-4 font-display text-xl text-chalk-100">Batalha não encontrada</h1>
        <p className="mt-2 text-sm text-chalk-300">
          O link pode estar incorreto ou a batalha foi removida.
        </p>
        <Link to="/batalhas" className="mt-6 inline-block rounded-xl bg-ink-800 px-5 py-2.5 text-sm font-semibold text-chalk-100">
          Ver todas as batalhas
        </Link>
      </div>
    );
  }

  // A partir daqui, `battle` está garantidamente definido (guard acima).
  const currentBattle = battle;
  const destination: [number, number] = [currentBattle.latitude, currentBattle.longitude];

  const state = getBattleLiveState(currentBattle, now);
  const favorited = currentUser ? isFavorite(currentUser.id, currentBattle.id) : false;
  const canEdit = currentUser && (currentUser.id === currentBattle.organizerId || currentUser.role === 'admin');

  async function handleFavorite() {
    if (!currentUser) {
      push({ type: 'info', title: 'Entre na sua conta', description: 'Faça login para favoritar batalhas.' });
      return;
    }
    const wasFavorited = favorited;
    await toggleFavorite(currentUser.id, currentBattle.id);
    push({ type: 'success', title: wasFavorited ? 'Removida dos favoritos' : 'Adicionada aos favoritos ⭐' });
  }

  async function handleShare() {
    const url = `${window.location.origin}/batalha/${currentBattle.slug}`;
    const shareData = {
      title: currentBattle.name,
      text: `Confira a ${currentBattle.name} no GPS DAS RIMAS!`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* usuário cancelou o compartilhamento */
      }
    } else {
      await navigator.clipboard.writeText(url);
      push({ type: 'success', title: 'Link copiado!', description: url });
    }
  }

  function handleDirections() {
    setWantsDirections(true);
    if (origin) {
      routing.calculate(origin, destination);
    } else {
      geo.request();
    }
  }

  function handlePickOriginOnMap() {
    setPickingOrigin(true);
  }

  function handlePickLocation(coords: [number, number]) {
    setManualOrigin(coords);
    setPickingOrigin(false);
    routing.calculate(coords, destination);
  }

  function handleToggleLiveNav() {
    if (liveNav) {
      geo.stopWatching();
      setLiveNav(false);
      setCurrentStepIndex(0);
      return;
    }
    if (!routing.data) return;
    setCurrentStepIndex(0);
    setLiveNav(true);
    geo.startWatching();
  }

  async function handleReport(reason: ReportReason, description: string) {
    if (!currentUser) {
      push({ type: 'info', title: 'Entre na sua conta', description: 'Faça login para denunciar uma informação.' });
      return;
    }
    const ok = await addReport(currentUser.id, currentBattle.id, reason, description);
    setReportOpen(false);
    if (ok) {
      push({ type: 'success', title: 'Denúncia enviada', description: 'Nossa moderação vai avaliar em breve.' });
    } else {
      push({ type: 'error', title: 'Não foi possível enviar', description: 'Tente novamente em instantes.' });
    }
  }

  return (
    <div className="pb-10">
      <div className="relative h-56 w-full overflow-hidden bg-ink-800 sm:h-72">
        {battle.image ? (
          <img src={battle.image} alt={battle.name} className="h-full w-full object-cover" />
        ) : (
          <img src={BRAND.heroBanner} alt="" className="h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <StatusBadge state={state} />
            <h1 className="mt-2 font-display text-3xl tracking-wide text-chalk-100 sm:text-4xl">
              {battle.name}
            </h1>
            <p className="mt-1 text-sm text-chalk-300">
              📍 {battle.city} - {battle.state} &nbsp;•&nbsp; 📅 {formatDateBR(battle.date)} &nbsp;•&nbsp; ⏰ {battle.time}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {battle.isDemo && (
            <div className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-2 text-xs text-chalk-500">
              ⚠️ Batalha de exemplo, criada apenas para demonstração do aplicativo.
            </div>
          )}

          <section>
            <h2 className="font-display text-lg text-chalk-100">Sobre a batalha</h2>
            <p className="mt-2 text-sm leading-relaxed text-chalk-300">{battle.description}</p>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Organizador" value={battle.organizerName} />
            <InfoItem label="Frequência" value={frequencyLabel(battle.frequency)} />
            <InfoItem label="Edições" value={String(battle.editionsCount)} />
            <InfoItem label="Avaliação" value={battle.rating > 0 ? `⭐ ${battle.rating.toFixed(1)}` : '—'} />
            {battle.participantsEstimate && (
              <InfoItem label="Participantes" value={`~${battle.participantsEstimate}`} />
            )}
            <InfoItem label="Dia da semana" value={battle.dayOfWeek} />
          </section>

          <section>
            <h2 className="font-display text-lg text-chalk-100">Local</h2>
            <p className="mt-1 text-sm text-chalk-300">{battle.address}</p>

            {pickingOrigin && (
              <p className="mt-2 rounded-lg border border-signal-yellow bg-ink-900/80 px-3 py-2 text-center text-xs font-semibold text-signal-yellow">
                📍 Toque no mapa abaixo para marcar de onde você está saindo
              </p>
            )}

            <div className="mt-3 h-64 overflow-hidden rounded-2xl border border-ink-700">
              <BattleMap
                battles={[{ battle, state }]}
                center={liveNav && origin ? origin : (origin ?? destination)}
                zoom={liveNav ? 17 : 14}
                userLocation={origin}
                userAccuracy={manualOrigin ? null : geo.accuracy}
                route={routing.data?.coordinates}
                followUser={liveNav}
                pickable={pickingOrigin}
                onPickLocation={handlePickLocation}
              />
            </div>

            {wantsDirections && (
              <div className="mt-3 space-y-2">
                <RouteInfoPanel
                  route={routing.data}
                  loading={routing.status === 'loading' || (geo.status === 'loading' && !origin)}
                  error={
                    routing.error ??
                    (geo.status === 'denied' && !origin ? geo.error : undefined)
                  }
                  destination={destination}
                  origin={origin}
                  onRetry={handleDirections}
                />
                {routing.data && routing.data.steps.length > 0 && (
                  <TurnByTurnPanel
                    steps={routing.data.steps}
                    currentIndex={currentStepIndex}
                    live={liveNav}
                    onToggleLive={handleToggleLiveNav}
                  />
                )}
                {geo.status === 'denied' && !origin && !pickingOrigin && (
                  <button
                    onClick={handlePickOriginOnMap}
                    className="w-full rounded-xl border border-ink-600 py-2.5 text-xs font-bold text-chalk-100 hover:border-signal-yellow"
                  >
                    📍 Marcar minha localização no mapa manualmente
                  </button>
                )}
              </div>
            )}
          </section>

          {(battle.instagram || battle.tiktok || battle.whatsapp) && (
            <section>
              <h2 className="font-display text-lg text-chalk-100">Redes sociais</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {battle.instagram && (
                  <SocialPill label={`Instagram · ${battle.instagram}`} />
                )}
                {battle.tiktok && <SocialPill label={`TikTok · ${battle.tiktok}`} />}
                {battle.whatsapp && <SocialPill label={`WhatsApp · ${battle.whatsapp}`} />}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 className="font-display text-lg text-chalk-100">Batalhas relacionadas</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((b) => (
                  <BattleCard key={b.id} battle={b} liveState={getBattleLiveState(b, now)} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <button
            onClick={handleDirections}
            disabled={geo.status === 'loading'}
            className="w-full rounded-xl bg-gps-blue py-3 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
          >
            {geo.status === 'loading' ? '📍 Localizando...' : '📍 Como chegar'}
          </button>
          <button
            onClick={handleFavorite}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold ${
              favorited
                ? 'border-signal-yellow bg-signal-yellow/10 text-signal-yellow'
                : 'border-ink-600 text-chalk-100 hover:border-signal-yellow'
            }`}
          >
            <MaskIcon src={ICONS.favorite} className="h-4 w-4" />
            {favorited ? 'Favoritada' : 'Favoritar'}
          </button>
          <button
            onClick={handleShare}
            className="w-full rounded-xl border border-ink-600 py-3 text-sm font-bold text-chalk-100 hover:border-gps-blue"
          >
            ↗ Compartilhar
          </button>
          {canEdit && (
            <button
              onClick={() => navigate(`/cadastrar?editar=${battle.id}`)}
              className="w-full rounded-xl border border-ink-600 py-3 text-sm font-bold text-chalk-100 hover:border-signal-green"
            >
              ✏️ Editar informações
            </button>
          )}
          <button
            onClick={() => setReportOpen(true)}
            className="w-full rounded-xl py-3 text-sm font-semibold text-signal-red/90 hover:bg-signal-red/10"
          >
            ⚠️ Denunciar informação
          </button>
        </aside>
      </div>

      {reportOpen && (
        <ReportDialog onClose={() => setReportOpen(false)} onSubmit={handleReport} />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-chalk-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-chalk-100">{value}</p>
    </div>
  );
}

function SocialPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-ink-600 px-3 py-1.5 text-xs text-chalk-300">
      {label}
    </span>
  );
}

function ReportDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: ReportReason, description: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason>('local_incorreto');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl border border-ink-600 bg-ink-800 p-6 sm:rounded-2xl">
        <h3 className="font-display text-lg text-chalk-100">Denunciar informação</h3>
        <p className="mt-1 text-xs text-chalk-500">Ajude a manter o mapa confiável para todo mundo.</p>

        <div className="mt-4 space-y-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.key}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                reason === r.key ? 'border-signal-yellow text-chalk-100' : 'border-ink-600 text-chalk-300'
              }`}
            >
              <input
                type="radio"
                name="reason"
                checked={reason === r.key}
                onChange={() => setReason(r.key)}
                className="accent-signal-yellow"
              />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes (opcional)"
          rows={3}
          className="mt-3 w-full rounded-xl border border-ink-600 bg-ink-900 p-3 text-sm text-chalk-100 placeholder:text-chalk-500 focus:border-signal-yellow focus:outline-none"
        />

        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-ink-600 py-2.5 text-sm font-semibold text-chalk-300">
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(reason, description)}
            className="flex-1 rounded-xl bg-signal-red py-2.5 text-sm font-semibold text-ink-950"
          >
            Enviar denúncia
          </button>
        </div>
      </div>
    </div>
  );
}
