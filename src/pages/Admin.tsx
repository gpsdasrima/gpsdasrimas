import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDateBR } from '../utils/date';
import type { Battle } from '../types';

type Tab = 'dashboard' | 'usuarios' | 'batalhas' | 'denuncias' | 'configuracoes';

const REASON_LABEL: Record<string, string> = {
  local_incorreto: 'Local incorreto',
  data_incorreta: 'Data incorreta',
  batalha_nao_existe: 'Batalha não existe',
  informacao_falsa: 'Informação falsa',
  outro: 'Outro',
};

const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'usuarios', label: 'Usuários', icon: '👥' },
  { key: 'batalhas', label: 'Batalhas', icon: '🎤' },
  { key: 'denuncias', label: 'Denúncias', icon: '⚠️' },
  { key: 'configuracoes', label: 'Configurações', icon: '⚙️' },
];

export function Admin() {
  const navigate = useNavigate();
  const { battles, setStatus, removeBattle, reports, resolveReport } = useBattleStore();
  const { allProfiles, fetchAllProfiles, promoteToAdmin, currentUser } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [statusFilter, setStatusFilter] = useState<Battle['status'] | 'todas'>('pendente');
  const [toRemove, setToRemove] = useState<Battle | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    fetchAllProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBattles = useMemo(() => {
    if (statusFilter === 'todas') return battles;
    return battles.filter((b) => b.status === statusFilter);
  }, [battles, statusFilter]);

  const pendingCount = battles.filter((b) => b.status === 'pendente').length;
  const approvedCount = battles.filter((b) => b.status === 'aprovada').length;
  const rejectedCount = battles.filter((b) => b.status === 'rejeitada').length;
  const openReports = reports.filter((r) => r.status === 'pendente');

  function battleFor(id: string) {
    return battles.find((b) => b.id === id);
  }

  function badgeFor(tabKey: Tab): number {
    if (tabKey === 'batalhas') return pendingCount;
    if (tabKey === 'denuncias') return openReports.length;
    return 0;
  }

  async function handleApprove(battle: Battle) {
    setBusyId(battle.id);
    const ok = await setStatus(battle.id, 'aprovada');
    setBusyId(null);
    push(
      ok
        ? { type: 'success', title: 'Batalha aprovada' }
        : { type: 'error', title: 'Não foi possível aprovar', description: 'Tente novamente em instantes.' }
    );
  }

  async function handleReject(battle: Battle) {
    setBusyId(battle.id);
    const ok = await setStatus(battle.id, 'rejeitada');
    setBusyId(null);
    push(
      ok
        ? { type: 'info', title: 'Batalha rejeitada' }
        : { type: 'error', title: 'Não foi possível rejeitar', description: 'Tente novamente em instantes.' }
    );
  }

  async function handleConfirmRemove() {
    if (!toRemove) return;
    setBusyId(toRemove.id);
    const ok = await removeBattle(toRemove.id);
    setBusyId(null);
    setToRemove(null);
    push(
      ok
        ? { type: 'success', title: 'Batalha removida' }
        : { type: 'error', title: 'Não foi possível remover', description: 'Tente novamente em instantes.' }
    );
  }

  async function handleResolveReport(id: string) {
    const ok = await resolveReport(id);
    push(
      ok
        ? { type: 'success', title: 'Denúncia marcada como resolvida' }
        : { type: 'error', title: 'Não foi possível resolver a denúncia.' }
    );
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    const result = await promoteToAdmin(promoteEmail.trim());
    setPromoting(false);
    if (result.ok) {
      push({ type: 'success', title: 'Usuário promovido a admin!' });
      setPromoteEmail('');
      fetchAllProfiles();
    } else {
      push({ type: 'error', title: 'Não foi possível promover', description: result.error });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl tracking-wide text-chalk-100">Painel administrativo</h1>
      <p className="mt-1 text-sm text-chalk-300">Modere batalhas, usuários e denúncias.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        {/* Navegação lateral no desktop */}
        <nav className="hidden lg:block">
          <div className="space-y-1 rounded-2xl border border-ink-700 bg-ink-800/50 p-2">
            {NAV_ITEMS.map((item) => {
              const badge = badgeFor(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    tab === item.key
                      ? 'bg-signal-yellow text-ink-950'
                      : 'text-chalk-300 hover:bg-ink-700'
                  }`}
                >
                  <span>
                    {item.icon} {item.label}
                  </span>
                  {badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        tab === item.key ? 'bg-ink-950/20 text-ink-950' : 'bg-signal-red/20 text-signal-red'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tabs no mobile */}
        <div className="flex gap-2 overflow-x-auto border-b border-ink-700 pb-0.5 lg:hidden [scrollbar-width:none]">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                tab === item.key ? 'border-signal-yellow text-chalk-100' : 'border-transparent text-chalk-500'
              }`}
            >
              {item.icon} {item.label}
              {badgeFor(item.key) > 0 && ` (${badgeFor(item.key)})`}
            </button>
          ))}
        </div>

        <div>
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Total de usuários" value={allProfiles.length} />
                <StatCard label="Batalhas cadastradas" value={battles.length} />
                <StatCard label="Pendentes" value={pendingCount} tone="blue" />
                <StatCard label="Aprovadas" value={approvedCount} tone="green" />
                <StatCard label="Rejeitadas" value={rejectedCount} tone="red" />
                <StatCard label="Denúncias abertas" value={openReports.length} tone="red" />
              </div>

              <div>
                <h2 className="font-display text-lg text-chalk-100">Batalhas pendentes</h2>
                {pendingCount === 0 ? (
                  <p className="mt-2 text-sm text-chalk-500">Nenhuma batalha aguardando revisão. 🎉</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {battles
                      .filter((b) => b.status === 'pendente')
                      .slice(0, 5)
                      .map((b) => (
                        <BattleRow
                          key={b.id}
                          battle={b}
                          busy={busyId === b.id}
                          onApprove={() => handleApprove(b)}
                          onReject={() => handleReject(b)}
                          onEdit={() => navigate(`/cadastrar?editar=${b.id}`)}
                          onRemove={() => setToRemove(b)}
                        />
                      ))}
                    {pendingCount > 5 && (
                      <button
                        onClick={() => setTab('batalhas')}
                        className="text-xs font-semibold text-gps-blue underline"
                      >
                        Ver todas as {pendingCount} pendentes →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'batalhas' && (
            <div>
              <div className="flex flex-wrap gap-2">
                {(['pendente', 'aprovada', 'rejeitada', 'todas'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
                      statusFilter === s
                        ? 'border-signal-yellow bg-signal-yellow/15 text-signal-yellow'
                        : 'border-ink-600 text-chalk-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {filteredBattles.length === 0 && (
                  <p className="text-sm text-chalk-500">Nenhuma batalha nesse status.</p>
                )}
                {filteredBattles.map((b) => (
                  <BattleRow
                    key={b.id}
                    battle={b}
                    busy={busyId === b.id}
                    onApprove={b.status !== 'aprovada' ? () => handleApprove(b) : undefined}
                    onReject={b.status !== 'rejeitada' ? () => handleReject(b) : undefined}
                    onEdit={() => navigate(`/cadastrar?editar=${b.id}`)}
                    onRemove={() => setToRemove(b)}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'usuarios' && (
            <div className="space-y-4">
              {currentUser && (
                <form
                  onSubmit={handlePromote}
                  className="flex flex-col gap-2 rounded-2xl border border-ink-700 bg-ink-800/50 p-4 sm:flex-row sm:items-center"
                >
                  <input
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    type="email"
                    placeholder="e-mail@exemplo.com"
                    className="flex-1 rounded-xl border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-chalk-100 placeholder:text-chalk-500 focus:border-signal-yellow focus:outline-none"
                  />
                  <button
                    disabled={promoting}
                    className="shrink-0 rounded-xl bg-signal-yellow px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
                  >
                    {promoting ? 'Promovendo...' : '👑 Promover a admin'}
                  </button>
                </form>
              )}

              <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-800/40 p-1">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-chalk-500">
                      <th className="px-3 pb-2 pt-3">Nome</th>
                      <th className="px-3 pb-2 pt-3">E-mail</th>
                      <th className="px-3 pb-2 pt-3">Cidade</th>
                      <th className="px-3 pb-2 pt-3">Papel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700">
                    {allProfiles.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2.5 font-medium text-chalk-100">{a.name}</td>
                        <td className="px-3 py-2.5 text-chalk-300">{a.email}</td>
                        <td className="px-3 py-2.5 text-chalk-300">{a.city ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              a.role === 'admin' ? 'bg-gps-blue/15 text-gps-blue' : 'bg-ink-700 text-chalk-300'
                            }`}
                          >
                            {a.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allProfiles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-chalk-500">
                          Nenhum usuário encontrado (ou você ainda não é admin no banco).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'denuncias' && (
            <div className="space-y-3">
              {reports.length === 0 && <p className="text-sm text-chalk-500">Nenhuma denúncia registrada.</p>}
              {reports.map((r) => {
                const battle = battleFor(r.battleId);
                return (
                  <div key={r.id} className="rounded-xl border border-ink-700 bg-ink-800/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-chalk-100">{battle?.name ?? 'Batalha removida'}</p>
                        <p className="mt-0.5 text-xs font-semibold text-signal-red">{REASON_LABEL[r.reason]}</p>
                        {r.description && <p className="mt-1 text-sm text-chalk-300">{r.description}</p>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === 'pendente' ? 'bg-gps-blue/15 text-gps-blue' : 'bg-signal-green/15 text-signal-green'
                        }`}
                      >
                        {r.status === 'pendente' ? 'Pendente' : 'Resolvida'}
                      </span>
                    </div>
                    {r.status === 'pendente' && (
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="mt-3 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-100 hover:border-signal-green hover:text-signal-green"
                      >
                        Marcar como resolvida
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'configuracoes' && (
            <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center">
              <p className="text-3xl">⚙️</p>
              <p className="mt-2 text-sm text-chalk-300">
                Configurações do painel chegam em uma próxima versão (permissões por equipe, categorias, moderação automática).
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!toRemove}
        title={`Remover "${toRemove?.name}"?`}
        description="Essa ação não pode ser desfeita. A batalha sairá do mapa e das listas."
        confirmLabel="Remover"
        danger
        onCancel={() => setToRemove(null)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'blue' | 'green' | 'red';
}) {
  const toneClass =
    tone === 'blue'
      ? 'text-gps-blue'
      : tone === 'green'
        ? 'text-signal-green'
        : tone === 'red'
          ? 'text-signal-red'
          : 'text-chalk-100';
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/50 p-4">
      <p className={`font-display text-2xl ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-chalk-500">{label}</p>
    </div>
  );
}

function BattleRow({
  battle,
  busy,
  onApprove,
  onReject,
  onEdit,
  onRemove,
}: {
  battle: Battle;
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-800/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-chalk-100">{battle.name}</p>
        <p className="text-xs text-chalk-500">
          {battle.city} - {battle.state} · {formatDateBR(battle.date)} às {battle.time} · por{' '}
          {battle.organizerName}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={busy}
            className="rounded-lg bg-signal-green/15 px-3 py-1.5 text-xs font-bold text-signal-green disabled:opacity-60"
          >
            Aprovar
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-lg bg-signal-red/15 px-3 py-1.5 text-xs font-bold text-signal-red disabled:opacity-60"
          >
            Rejeitar
          </button>
        )}
        <button onClick={onEdit} className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-100">
          Editar
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-300 hover:border-signal-red hover:text-signal-red disabled:opacity-60"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
