import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/useAuth';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { NAV_ITEMS, ROUTES } from '../routes';
import './appLayout.css';

/** Marco de la aplicación: el índice del expediente y la hoja abierta. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Navegar cierra el cajón en pantallas angostas.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="shell">
      <aside className={`shell__index${navOpen ? ' is-open' : ''}`}>
        <NavLink to={ROUTES.profile} className="shell__mark">
          <span className="shell__mark-name">TeamMatchUp</span>
          <span className="label">Hoja de inscripción</span>
        </NavLink>

        <nav className="shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `shell__link${isActive ? ' is-active' : ''}`}
            >
              <span className="shell__folio num">{item.folio}</span>
              <Icon as={item.icon} size={15} />
              <span className="grow">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {env.useMockApi ? (
          <p className="shell__note">
            <strong>Datos de demostración.</strong> Nada de lo que ves proviene de Riot, Ubisoft o
            Steam todavía. Define <code>VITE_API_URL</code> para conectar el servidor.
          </p>
        ) : null}

        {user ? (
          <div className="shell__signer">
            <Monogram name={user.displayName} color={user.avatarColor} size="sm" />
            <span className="grow shell__signer-name">
              <strong>{user.displayName}</strong>
              <span className="note note--faint">@{user.username}</span>
            </span>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <Icon as={LogOut} size={13} label="Cerrar sesión" />
            </button>
          </div>
        ) : null}
      </aside>

      <div className="shell__main">
        <header className="shell__bar">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setNavOpen((open) => !open)}
            aria-expanded={navOpen}
          >
            <Icon as={navOpen ? X : Menu} size={14} />
            Índice
          </button>
          <span className="shell__bar-name">TeamMatchUp</span>
        </header>

        {navOpen ? (
          <button
            type="button"
            className="shell__scrim"
            aria-label="Cerrar el índice"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <main className="shell__page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
