import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Crown,
  LayoutDashboard,
  Mic2,
  PartyPopper,
  Pencil,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabaseClient';
import { rowToAuditLogEntry } from '../lib/mappers';
import { formatDateBR } from '../utils/date';
import { maskEmail } from '../utils/mask';
import type { AuditLogEntry, Battle } from '../types';

type Tab = 'dashboard' | 'usuarios' | 'batalhas' | 'denuncias' | 'atividade' | 'configuracoes';

const REASON_LABEL: Record<string, string> = {
  local_incorreto: 'Local incorreto',
  data_incorreta: 'Data incorreta',
  batalha_nao_existe: 'Batalha não existe',
  informacao_falsa: 'Informação falsa',
  outro: 'Outro',
};

const ACTION_LABEL: Record<string, string> = {
  aprovar_batalha: 'aprovou a batalha',
  rejeitar_batalha: 'rejeitou a batalha',
  alterar_status_batalha: 'alterou o status da batalha',
  remover_batalha: 'removeu a batalha',
  promover_admin: 'promoveu a administrador',
  resolver_denuncia: 'resolveu a denúncia',
};

const NAV_ITEMS: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'batalhas', label: 'Batalhas', icon: Mic2 },
  { key: 'denuncias', label: 'Denúncias', icon: AlertTriangle },
  { key: 'atividade', label: 'Atividade', icon: Activity },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
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
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    fetchAllProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== 'atividade') return;
    setAuditLoading(true);
    supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setAuditLog(data.map(rowToAuditLogEntry));
        setAuditLoading(false);
      });
  }, [tab]);

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
              const Icon = item.icon;
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
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    {item.label}
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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold ${
                  tab === item.key ? 'border-signal-yellow text-chalk-100' : 'border-transparent text-chalk-500'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
                {badgeFor(item.key) > 0 && ` (${badgeFor(item.key)})`}
              </button>
            );
          })}
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
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-chalk-500">
                    <PartyPopper className="h-4 w-4" strokeWidth={2} />
                    Nenhuma batalha aguardando revisão.
                  </p>
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
                        className="flex items-center gap-1 text-xs font-semibold text-gps-blue underline"
                      >
                        Ver todas as {pendingCount} pendentes <ArrowRight className="h-3.5 w-3.5" />
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
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-signal-yellow px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
                  >
                    <Crown className="h-4 w-4" strokeWidth={2.25} />
                    {promoting ? 'Promovendo...' : 'Promover a admin'}
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
                        <td className="px-3 py-2.5 font-mono text-xs text-chalk-300">{maskEmail(a.email)}</td>
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
              <p className="text-xs text-chalk-600">
                Os e-mails aparecem parcialmente ocultos por privacidade, mesmo aqui no painel admin.
              </p>
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
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-100 hover:border-signal-green hover:text-signal-green"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                        Marcar como resolvida
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'atividade' && (
            <div>
              <p className="mb-3 text-xs text-chalk-500">
                Últimas 50 ações de moderação — aprovar/rejeitar/remover batalha, promover admin e resolver
                denúncia. Registrado automaticamente pelo banco, ninguém consegue apagar ou forjar essas linhas.
              </p>
              {auditLoading ? (
                <p className="text-sm text-chalk-500">Carregando...</p>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-chalk-500">Nenhuma atividade registrada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {auditLog.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-800/50 p-3.5"
                    >
                      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-gps-blue" strokeWidth={2} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-chalk-100">
                          <span className="font-semibold">{entry.actorName ?? 'Alguém'}</span>{' '}
                          {ACTION_LABEL[entry.action] ?? entry.action}
                          {entry.targetLabel && <span className="text-chalk-300"> "{entry.targetLabel}"</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-chalk-500">
                          {new Date(entry.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'configuracoes' && (
            <div className="rounded-2xl border border-dashed border-ink-600 p-8 text-center">
              <Settings className="mx-auto h-8 w-8 text-chalk-600" strokeWidth={1.5} />
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
            className="flex items-center gap-1 rounded-lg bg-signal-green/15 px-3 py-1.5 text-xs font-bold text-signal-green disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
            Aprovar
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-signal-red/15 px-3 py-1.5 text-xs font-bold text-signal-red disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            Rejeitar
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-100"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Editar
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg border border-ink-600 px-3 py-1.5 text-xs font-bold text-chalk-300 hover:border-signal-red hover:text-signal-red disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Remover
        </button>
      </div>
    </div>
  );
}
