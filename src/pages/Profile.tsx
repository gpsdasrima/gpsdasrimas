import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { useToastStore } from '../store/toastStore';
import { TextField } from '../components/FormField';
import { ImageUploadField } from '../components/ImageUploadField';
import { MaskIcon } from '../components/MaskIcon';
import { BattleCard } from '../components/BattleCard';
import { useNow } from '../hooks/useNow';
import { getBattleLiveState } from '../utils/date';
import { ICONS } from '../constants/assets';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Em análise',
  aprovada: 'Publicada',
  rejeitada: 'Rejeitada',
};

const STATUS_COLOR: Record<string, string> = {
  pendente: 'text-gps-blue',
  aprovada: 'text-signal-green',
  rejeitada: 'text-signal-red',
};

export function Profile() {
  const { currentUser, updateProfile } = useAuthStore();
  const { battlesByOrganizer, favoritesForUser } = useBattleStore();
  const push = useToastStore((s) => s.push);
  const now = useNow();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? '');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const myBattles = battlesByOrganizer(currentUser.id);
  const myFavorites = favoritesForUser(currentUser.id);

  async function handleSave() {
    setSaving(true);
    const ok = await updateProfile({ name, city, avatar });
    setSaving(false);
    if (ok) {
      setEditing(false);
      push({ type: 'success', title: 'Perfil atualizado!' });
    } else {
      push({ type: 'error', title: 'Não foi possível salvar', description: 'Tente novamente em instantes.' });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-ink-700 bg-ink-800/50 p-6 sm:flex-row sm:items-start">
        {!editing && (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-700">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
            ) : (
              <MaskIcon src={ICONS.profile} className="h-9 w-9 text-chalk-500" alt="Sem foto" />
            )}
          </div>
        )}

        {editing ? (
          <div className="w-full flex-1 space-y-3">
            <ImageUploadField
              label="Foto de perfil"
              value={avatar}
              onChange={setAvatar}
              bucket="avatars"
              userId={currentUser.id}
              shape="circle"
              hint="Escolha uma foto da galeria do seu aparelho."
            />
            <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-signal-yellow px-4 py-2 text-sm font-bold text-ink-950 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setAvatar(currentUser.avatar ?? '');
                }}
                className="rounded-xl border border-ink-600 px-4 py-2 text-sm text-chalk-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl tracking-wide text-chalk-100">{currentUser.name}</h1>
            <p className="mt-0.5 text-sm text-chalk-300">{currentUser.email}</p>
            {currentUser.city && (
              <p className="flex items-center justify-center gap-1 text-sm text-chalk-500 sm:justify-start">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> {currentUser.city}
              </p>
            )}
            {currentUser.role === 'admin' && (
              <span className="mt-2 inline-block rounded-full bg-gps-blue/15 px-3 py-1 text-xs font-semibold text-gps-blue">
                Administrador
              </span>
            )}
            <div className="mt-3">
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl border border-ink-600 px-4 py-2 text-sm font-semibold text-chalk-100 hover:border-signal-yellow"
              >
                Editar perfil
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Link
          to="/favoritos"
          className="rounded-2xl border border-ink-700 bg-ink-800/50 p-4 text-center hover:border-signal-yellow"
        >
          <p className="font-display text-2xl text-chalk-100">{myFavorites.length}</p>
          <p className="text-xs text-chalk-500">Favoritas</p>
        </Link>
        <div className="rounded-2xl border border-ink-700 bg-ink-800/50 p-4 text-center">
          <p className="font-display text-2xl text-chalk-100">{myBattles.length}</p>
          <p className="text-xs text-chalk-500">Cadastradas</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg text-chalk-100">Minhas batalhas cadastradas</h2>
        {myBattles.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-500">Você ainda não cadastrou nenhuma batalha.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myBattles.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-800/50 px-4 py-3"
              >
                <div>
                  <Link to={`/batalha/${b.slug}`} className="font-semibold text-chalk-100 hover:text-signal-yellow">
                    {b.name}
                  </Link>
                  <p className="text-xs text-chalk-500">
                    {b.city} - {b.state}
                  </p>
                </div>
                <span className={`text-xs font-bold ${STATUS_COLOR[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {myFavorites.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg text-chalk-100">Suas favoritas</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myFavorites.map((b) => (
              <BattleCard key={b.id} battle={b} liveState={getBattleLiveState(b, now)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
