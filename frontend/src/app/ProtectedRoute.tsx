import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { ROUTES } from './routes';

/**
 * Control de acceso del cliente: el perfil, las coincidencias y la agenda solo
 * existen para usuarios autenticados. La verificación real la hace el backend;
 * esto evita mostrar vistas vacías y recuerda a dónde quería ir el usuario.
 * Nunca se monta con la sesión en `checking` o `error`: `SessionGate` lo impide (RF-5).
 * Sin usuario de sesión lleva a login con `replace` (RF-25: «Atrás» no deja en la
 * vista descartada) recordando solo la ruta, sin parámetros de consulta y sin aviso.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status !== 'authenticated') {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Inverso del anterior: con usuario de sesión, la entrada, el login y el registro
 * llevan a Inicio con `replace` sin mostrar el formulario (RF-33).
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'authenticated') return <Navigate to={ROUTES.home} replace />;

  return <Outlet />;
}
