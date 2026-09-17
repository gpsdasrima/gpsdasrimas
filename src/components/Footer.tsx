import { Link } from 'react-router-dom';
import { BRAND } from '../constants/assets';

export function Footer() {
  return (
    <footer className="hidden border-t border-ink-700 bg-ink-950 px-4 py-6 sm:px-6 md:block">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src={BRAND.wordmark} alt="GPS DAS RIMAS" className="h-9 w-auto opacity-90" />
          <p className="text-xs text-chalk-500">O mapa nacional das batalhas de rima</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-chalk-500">
          <Link to="/mapa" className="hover:text-signal-yellow">
            📍 Mapa
          </Link>
          <span>👥 Comunidade</span>
          <span>💻 Tecnologia</span>
          <span>🎨 Cultura Viva</span>
        </nav>
      </div>
    </footer>
  );
}
