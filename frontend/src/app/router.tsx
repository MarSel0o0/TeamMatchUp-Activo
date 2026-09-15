import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Working } from '@/shared/components/States';
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));

export function AppRouter() {
  return (
    <Suspense fallback={<Working label="Abriendo la hoja…" />}>
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
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
