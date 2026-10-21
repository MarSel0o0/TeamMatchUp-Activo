import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Working } from '@/shared/components/States';
import { LOADING_TEXT } from '@/shared/utils/copy';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { ROUTES } from './routes';

/**
 * Cada vista se carga bajo demanda: la pantalla de acceso no descarga el código
 * de la agenda ni de las coincidencias, y agregar vistas nuevas no engorda el
 * paquete inicial.
 */
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/features/profile/pages/SettingsPage'));
const MatchesPage = lazy(() => import('@/features/matches/pages/MatchesPage'));
const SchedulePage = lazy(() => import('@/features/sessions/pages/SchedulePage'));
const SessionDetailPage = lazy(() => import('@/features/sessions/pages/SessionDetailPage'));
const PlayerPage = lazy(() => import('@/features/players/pages/PlayerPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));

/**
 * Reglas de sesión de las rutas (RF-25, RF-28, RF-33): las públicas (entrada, login
 * y registro) viven bajo `PublicOnlyRoute`, las vistas de la aplicación bajo
 * `ProtectedRoute`, y `*` queda fuera de las dos, de modo que «no encontrada» se
 * muestra con o sin sesión sin llevar a login ni recordar ruta de origen.
 */
export function AppRouter() {
  return (
    <Suspense fallback={<Working label={LOADING_TEXT} />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path={ROUTES.landing} element={<LandingPage />} />
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route path={ROUTES.matches} element={<MatchesPage />} />
            <Route path={ROUTES.schedule} element={<SchedulePage />} />
            {/* Detalle de una sesión (spec 009, RF-1): protegido y diferido como las demás. */}
            <Route path={ROUTES.sessionDetail} element={<SessionDetailPage />} />
            {/* Ficha de otro jugador (spec 008, RF-1): protegida y diferida como las demás. */}
            <Route path={ROUTES.player} element={<PlayerPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
