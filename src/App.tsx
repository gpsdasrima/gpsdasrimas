import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { ToastViewport } from './components/ToastViewport';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SplashScreen } from './components/SplashScreen';
import { useAuthStore } from './store/authStore';
import { useBattleStore } from './store/battleStore';

// As páginas mais pesadas (mapa/Leaflet, formulários grandes) só entram no
// bundle quando a pessoa realmente navega até elas — reduz o JS inicial
// baixado antes da Home aparecer.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const BattlesList = lazy(() => import('./pages/BattlesList').then((m) => ({ default: m.BattlesList })));
const BattleDetail = lazy(() => import('./pages/BattleDetail').then((m) => ({ default: m.BattleDetail })));
const RegisterBattle = lazy(() => import('./pages/RegisterBattle').then((m) => ({ default: m.RegisterBattle })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Favorites = lazy(() => import('./pages/Favorites').then((m) => ({ default: m.Favorites })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-600 border-t-signal-yellow" />
    </div>
  );
}

function App() {
  const initAuth = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);
  const fetchBattles = useBattleStore((s) => s.fetchBattles);
  const currentUser = useAuthStore((s) => s.currentUser);
  const fetchFavorites = useBattleStore((s) => s.fetchFavorites);
  const fetchReports = useBattleStore((s) => s.fetchReports);
  const clearLocalUserData = useBattleStore((s) => s.clearLocalUserData);

  // Carrega a sessão do Supabase e as batalhas assim que o app abre.
  useEffect(() => {
    initAuth();
    fetchBattles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre que o usuário logado mudar (login/logout), busca os dados
  // privados dele (favoritos/denúncias) ou limpa o cache local.
  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
      fetchReports();
    } else {
      clearLocalUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ToastViewport />
      <main className="flex-1 pb-16 md:pb-0">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/batalhas" element={<BattlesList />} />
            <Route path="/batalha/:slug" element={<BattleDetail />} />
            <Route
              path="/cadastrar"
              element={
                <ProtectedRoute>
                  <RegisterBattle />
                </ProtectedRoute>
              }
            />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastrar-conta" element={<Signup />} />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favoritos"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default App;
