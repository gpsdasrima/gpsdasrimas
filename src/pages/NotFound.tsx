import { Link } from 'react-router-dom';
import { BRAND } from '../constants/assets';

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <img src={BRAND.mascot} alt="" className="h-48 object-contain" />
      <h1 className="mt-2 font-display text-3xl tracking-wide text-chalk-100">404</h1>
      <p className="mt-2 text-sm text-chalk-300">Essa página saiu de cena.</p>
      <Link to="/" className="mt-6 rounded-xl bg-signal-yellow px-5 py-2.5 text-sm font-bold text-ink-950">
        Voltar para o início
      </Link>
    </div>
  );
}
