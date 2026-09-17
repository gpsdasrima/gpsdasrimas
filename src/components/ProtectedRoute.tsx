import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { currentUser, initializing } = useAuthStore();
  const location = useLocation();

  // Enquanto a sessão do Supabase ainda está sendo restaurada (ex.: logo
  // após recarregar a página), evita redirecionar para /entrar por engano.
  if (initializing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-signal-yellow" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
