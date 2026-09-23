import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { TextField } from '../components/FormField';
import { BRAND } from '../constants/assets';

export function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use letras e números na senha para ficar mais difícil de adivinhar.');
      return;
    }
    setLoading(true);
    const result = await signup({ name, email, password, city });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Erro ao criar conta.');
      return;
    }
    if (result.needsEmailConfirmation) {
      push({
        type: 'info',
        title: 'Quase lá!',
        description: 'Enviamos um link de confirmação para o seu e-mail. Confirme para poder entrar.',
      });
      navigate('/entrar');
      return;
    }
    push({ type: 'success', title: 'Conta criada!', description: `Bem-vindo(a), ${name.split(' ')[0]}.` });
    navigate('/');
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <img src={BRAND.mascot} alt="" className="mx-auto h-32 object-contain" />
        <h1 className="mt-1 font-display text-2xl tracking-wide text-chalk-100">Criar conta</h1>
        <p className="mt-1 text-sm text-chalk-300">Entre para a cena. É rápido.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
        <TextField
          label="Senha"
          type="password"
          required
          hint="Mínimo de 8 caracteres, com letras e números."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-signal-yellow py-3 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-chalk-300">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-signal-yellow">
          Entrar
        </Link>
      </p>
    </div>
  );
}
