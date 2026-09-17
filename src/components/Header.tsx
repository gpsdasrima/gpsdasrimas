import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { MaskIcon } from './MaskIcon';
import { BRAND, ICONS } from '../constants/assets';

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: ICONS.home },
  { to: '/mapa', label: 'Mapa', icon: ICONS.map },
  { to: '/batalhas', label: 'Batalhas', icon: null },
  { to: '/cadastrar', label: 'Cadastrar batalha', icon: ICONS.add },
  { to: '/favoritos', label: 'Favoritos', icon: ICONS.favorite },
];

export function Header() {
  const { currentUser, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex shrink-0 items-center">
          <img src={BRAND.wordmark} alt="GPS DAS RIMAS" className="h-11 w-auto sm:h-12" />
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-800 text-signal-yellow'
                    : 'text-chalk-300 hover:bg-ink-800 hover:text-chalk-100'
                }`
              }
            >
              {item.icon && <MaskIcon src={item.icon} className="h-4 w-4" />}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? (
            <>
              <NavLink
                to="/perfil"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-chalk-300 hover:bg-ink-800 hover:text-chalk-100"
              >
                <MaskIcon src={ICONS.profile} className="h-4 w-4" />
                {currentUser.name.split(' ')[0]}
              </NavLink>
              {currentUser.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gps-blue hover:bg-ink-800"
                >
                  Admin
                </NavLink>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="rounded-lg border border-ink-600 px-3 py-2 text-sm font-medium text-chalk-300 hover:border-signal-red hover:text-signal-red"
              >
                Sair
              </button>
            </>
          ) : (
            <NavLink
              to="/entrar"
              className="rounded-lg bg-signal-yellow px-4 py-2 text-sm font-semibold text-ink-950 hover:brightness-110"
            >
              Entrar
            </NavLink>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-600 text-chalk-100 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-ink-700 bg-ink-950 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive ? 'bg-ink-800 text-signal-yellow' : 'text-chalk-300'
                  }`
                }
              >
                {item.icon && <MaskIcon src={item.icon} className="h-4 w-4" />}
                {item.label}
              </NavLink>
            ))}
            {currentUser ? (
              <>
                <NavLink
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-chalk-300"
                >
                  Perfil ({currentUser.name.split(' ')[0]})
                </NavLink>
                {currentUser.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-gps-blue"
                  >
                    Painel admin
                  </NavLink>
                )}
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                    navigate('/');
                  }}
                  className="rounded-lg px-3 py-3 text-left text-sm font-medium text-signal-red"
                >
                  Sair
                </button>
              </>
            ) : (
              <NavLink
                to="/entrar"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-lg bg-signal-yellow px-3 py-3 text-center text-sm font-semibold text-ink-950"
              >
                Entrar
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
