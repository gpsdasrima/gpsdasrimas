import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBattleStore } from '../store/battleStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { TextField, TextAreaField, SelectField } from '../components/FormField';
import { ImageUploadField } from '../components/ImageUploadField';
import { LocationPicker } from '../components/LocationPicker';
import type { BattleFormData, BattleFrequency } from '../types';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const DIAS_SEMANA = [
  'Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado',
];

const EMPTY_FORM: BattleFormData = {
  name: '',
  description: '',
  city: '',
  state: '',
  neighborhood: '',
  address: '',
  latitude: null,
  longitude: null,
  date: '',
  time: '',
  dayOfWeek: '',
  frequency: 'unico',
  instagram: '',
  tiktok: '',
  whatsapp: '',
  image: '',
  organizerName: '',
};

export function RegisterBattle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editar');
  const { battles, addBattle, updateBattle } = useBattleStore();
  const { currentUser } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const editingBattle = editId ? battles.find((b) => b.id === editId) : undefined;

  function formFromBattle(b: typeof editingBattle): BattleFormData {
    if (!b) return EMPTY_FORM;
    return {
      name: b.name,
      description: b.description,
      city: b.city,
      state: b.state,
      neighborhood: b.neighborhood,
      address: b.address,
      latitude: b.latitude,
      longitude: b.longitude,
      date: b.date,
      time: b.time,
      dayOfWeek: b.dayOfWeek,
      frequency: b.frequency,
      instagram: b.instagram ?? '',
      tiktok: b.tiktok ?? '',
      whatsapp: b.whatsapp ?? '',
      image: b.image ?? '',
      organizerName: b.organizerName,
    };
  }

  // Estado inicial derivado uma única vez a partir da batalha em edição
  // (se houver), evitando setState redundante dentro de um efeito.
  const [form, setForm] = useState<BattleFormData>(() => formFromBattle(editingBattle));
  const [recurrent, setRecurrent] = useState(() => editingBattle?.frequency === 'semanal');
  const [errors, setErrors] = useState<Partial<Record<keyof BattleFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/entrar', { state: { from: '/cadastrar' } });
    }
  }, [currentUser, navigate]);

  function set<K extends keyof BattleFormData>(key: K, value: BattleFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof BattleFormData, string>> = {};
    if (!form.name.trim()) next.name = 'Informe o nome da batalha.';
    if (!form.description.trim()) next.description = 'Descreva a batalha.';
    if (!form.city.trim()) next.city = 'Informe a cidade.';
    if (!form.state.trim()) next.state = 'Selecione o estado.';
    if (!form.neighborhood.trim()) next.neighborhood = 'Informe o bairro.';
    if (!form.address.trim()) next.address = 'Informe o endereço.';
    if (form.latitude === null || form.longitude === null)
      next.latitude = 'Marque a localização no mapa.';
    if (!form.date) next.date = 'Informe a data.';
    if (!form.time) next.time = 'Informe o horário.';
    if (!form.dayOfWeek) next.dayOfWeek = 'Selecione o dia da semana.';
    if (!form.organizerName.trim()) next.organizerName = 'Informe o nome do organizador.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    if (!validate()) {
      push({ type: 'error', title: 'Revise o formulário', description: 'Alguns campos obrigatórios não foram preenchidos.' });
      return;
    }
    setSubmitting(true);

    if (editingBattle) {
      const ok = await updateBattle(editingBattle.id, {
        ...form,
        latitude: form.latitude!,
        longitude: form.longitude!,
        instagram: form.instagram || undefined,
        tiktok: form.tiktok || undefined,
        whatsapp: form.whatsapp || undefined,
        image: form.image || undefined,
      });
      setSubmitting(false);
      if (!ok) {
        push({ type: 'error', title: 'Não foi possível salvar', description: 'Tente novamente em instantes.' });
        return;
      }
      push({ type: 'success', title: 'Batalha atualizada!' });
      navigate(`/batalha/${editingBattle.slug}`);
      return;
    }

    const created = await addBattle(form, currentUser.id, currentUser.name);
    setSubmitting(false);
    if (!created) {
      push({ type: 'error', title: 'Não foi possível cadastrar', description: 'Tente novamente em instantes.' });
      return;
    }
    push({
      type: 'success',
      title: 'Batalha enviada!',
      description: 'Agora ela será analisada pela comunidade/moderação.',
    });
    navigate(`/batalha/${created.slug}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl tracking-wide text-chalk-100">
        {editingBattle ? 'Editar batalha' : 'Cadastre uma batalha'}
      </h1>
      <p className="mt-1 text-sm text-chalk-300">
        Preencha as informações abaixo. Batalhas novas passam por uma revisão antes de aparecer no mapa.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <fieldset className="space-y-4 rounded-2xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
          <legend className="px-1 font-display text-sm tracking-wide text-chalk-100">Informações gerais</legend>
          <TextField
            label="Nome da batalha"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            placeholder="Ex: Batalha da Aldeota"
          />
          <TextAreaField
            label="Descrição"
            required
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            error={errors.description}
            placeholder="Conte a história da batalha, formato das disputas, público..."
          />
          <TextField
            label="Nome do organizador"
            required
            value={form.organizerName}
            onChange={(e) => set('organizerName', e.target.value)}
            error={errors.organizerName}
          />
          <ImageUploadField
            label="Banner da batalha"
            value={form.image}
            onChange={(url) => set('image', url)}
            bucket="battle-images"
            userId={currentUser!.id}
            shape="banner"
            hint="Opcional. Escolha uma foto larga do local ou da edição anterior direto do seu aparelho."
          />
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
          <legend className="px-1 font-display text-sm tracking-wide text-chalk-100">Local</legend>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Cidade"
              required
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              error={errors.city}
            />
            <SelectField
              label="Estado"
              required
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              error={errors.state}
            >
              <option value="">Selecione</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Bairro"
            required
            value={form.neighborhood}
            onChange={(e) => set('neighborhood', e.target.value)}
            error={errors.neighborhood}
          />
          <TextField
            label="Endereço"
            required
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            error={errors.address}
            placeholder="Rua, número, ponto de referência"
          />
          <div>
            <span className="text-sm font-medium text-chalk-300">
              Localização no mapa <span className="text-signal-red">*</span>
            </span>
            <p className="mt-1 text-xs text-chalk-500">Toque no mapa para marcar o ponto exato.</p>
            <div className="mt-2 h-56 overflow-hidden rounded-xl border border-ink-600">
              <LocationPicker
                value={form.latitude !== null && form.longitude !== null ? [form.latitude, form.longitude] : null}
                onChange={([lat, lng]) => {
                  set('latitude', lat);
                  set('longitude', lng);
                }}
              />
            </div>
            {errors.latitude && <span className="mt-1 block text-xs text-signal-red">{errors.latitude}</span>}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
          <legend className="px-1 font-display text-sm tracking-wide text-chalk-100">Quando acontece</legend>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Data"
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
            <TextField
              label="Horário"
              type="time"
              required
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              error={errors.time}
            />
          </div>
          <SelectField
            label="Dia da semana"
            required
            value={form.dayOfWeek}
            onChange={(e) => set('dayOfWeek', e.target.value)}
            error={errors.dayOfWeek}
          >
            <option value="">Selecione</option>
            {DIAS_SEMANA.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>

          <label className="flex items-center gap-2 rounded-xl border border-ink-600 px-3.5 py-3 text-sm text-chalk-300">
            <input
              type="checkbox"
              checked={recurrent}
              onChange={(e) => {
                setRecurrent(e.target.checked);
                if (e.target.checked) set('frequency', 'semanal');
              }}
              className="accent-signal-yellow"
            />
            Essa batalha acontece toda semana
          </label>

          {!recurrent && (
            <SelectField
              label="Frequência"
              required
              value={form.frequency}
              onChange={(e) => set('frequency', e.target.value as BattleFrequency)}
            >
              <option value="unico">Evento único</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </SelectField>
          )}
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
          <legend className="px-1 font-display text-sm tracking-wide text-chalk-100">Redes sociais</legend>
          <TextField label="Instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario" />
          <TextField label="TikTok" value={form.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="@usuario" />
          <TextField label="WhatsApp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5585999999999" />
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-signal-yellow py-3.5 text-sm font-bold uppercase tracking-wide text-ink-950 shadow-card transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? 'Publicando...' : editingBattle ? 'Salvar alterações' : 'Publicar batalha'}
        </button>
      </form>
    </div>
  );
}
