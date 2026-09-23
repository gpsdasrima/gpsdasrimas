import { Link } from 'react-router-dom';
import { Map, Palette, Sparkles, Users } from 'lucide-react';
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
          <Link to="/mapa" className="flex items-center gap-1.5 hover:text-signal-yellow">
            <Map className="h-3.5 w-3.5" strokeWidth={2} /> Mapa
          </Link>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" strokeWidth={2} /> Comunidade
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Tecnologia
          </span>
          <span className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" strokeWidth={2} /> Cultura Viva
          </span>
        </nav>
      </div>
    </footer>
  );
}
