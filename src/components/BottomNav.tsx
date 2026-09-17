import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MaskIcon } from './MaskIcon';
import { ICONS } from '../constants/assets';

const SIDE_ITEMS = [
  { to: '/', label: 'Início', icon: ICONS.home },
  { to: '/mapa', label: 'Mapa', icon: ICONS.map },
];

const SIDE_ITEMS_RIGHT = [
  { to: '/favoritos', label: 'Favoritos', icon: ICONS.favorite },
  { to: '/perfil', label: 'Perfil', icon: ICONS.profile },
];

export function BottomNav() {
  const { currentUser } = useAuthStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-700 bg-ink-950/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 items-end">
        {SIDE_ITEMS.map((item) => (
          <TabLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}

        {/* Botão de cadastrar em destaque, no centro, acima da barra */}
        <div className="flex justify-center">
          <NavLink
            to="/cadastrar"
            aria-label="Cadastrar batalha"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-signal-yellow text-ink-950 shadow-card ring-4 ring-ink-950 transition-transform active:scale-95"
          >
            <MaskIcon src={ICONS.add} className="h-6 w-6" />
          </NavLink>
        </div>

        {SIDE_ITEMS_RIGHT.map((item) => {
          const to = item.to === '/perfil' && !currentUser ? '/entrar' : item.to;
          return <TabLink key={item.to} to={to} label={item.label} icon={item.icon} />;
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-ink-950" />
    </nav>
  );
}

function TabLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
          isActive ? 'text-signal-yellow' : 'text-chalk-500'
        }`
      }
    >
      <MaskIcon src={icon} className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
