import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { LoadingState } from '@/shared/components/States';
import { ROUTES } from './routes';

/**
 * Control de acceso del cliente: el perfil, las coincidencias y la agenda solo
 * existen para usuarios autenticados. La verificación real la hace el backend;
 * esto evita mostrar vistas vacías y recuerda a dónde quería ir el usuario.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isRestoring } = useAuth();
  const location = useLocation();

  if (isRestoring) return <LoadingState label="Restaurando tu sesión…" />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Inverso del anterior: mantiene a un usuario con sesión fuera del login. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) return <LoadingState label="Restaurando tu sesión…" />;
  if (isAuthenticated) return <Navigate to={ROUTES.profile} replace />;

  return <Outlet />;
}
