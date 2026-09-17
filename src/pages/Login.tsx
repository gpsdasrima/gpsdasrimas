import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { TextField } from '../components/FormField';
import { BRAND } from '../constants/assets';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const push = useToastStore((s) => s.push);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Erro ao entrar.');
      return;
    }
    push({ type: 'success', title: `E aí, MC! 🎤`, description: 'Login realizado com sucesso.' });
    navigate(from, { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <img src={BRAND.mascot} alt="" className="mx-auto h-32 object-contain" />
        <h1 className="mt-1 font-display text-2xl tracking-wide text-chalk-100">Entrar</h1>
        <p className="mt-1 text-sm text-chalk-300">Acesse sua conta no GPS DAS RIMAS.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
        <TextField
          label="Senha"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p className="text-sm text-signal-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-signal-yellow py-3 text-sm font-bold text-ink-950 hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-chalk-300">
        Ainda não tem conta?{' '}
        <Link to="/cadastrar-conta" className="font-semibold text-signal-yellow">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
