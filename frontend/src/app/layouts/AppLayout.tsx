import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Avatar } from '@/shared/components/Avatar';
import { env } from '@/config/env';
import { NAV_ITEMS, ROUTES } from '../routes';
import './appLayout.css';

/** Marco de la aplicación autenticada: navegación lateral + contenido. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className={`app-sidebar${menuOpen ? ' is-open' : ''}`}>
        <NavLink to={ROUTES.profile} className="app-sidebar__brand">
          <img src="/logo.svg" alt="" width={28} height={28} />
          <span>TeamMatchUp</span>
        </NavLink>

        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-sidebar__link${isActive ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {env.useMockApi ? (
          <p className="app-sidebar__note">
            Datos de demostración en el navegador. Define <code>VITE_API_URL</code> para conectar el
            servidor.
          </p>
        ) : null}

        {user ? (
          <div className="app-sidebar__user">
            <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
            <div className="app-sidebar__user-info">
              <strong>{user.displayName}</strong>
              <span className="faint">@{user.username}</span>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
              Salir
            </button>
          </div>
        ) : null}
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm app-topbar__toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
          >
            ☰ Menú
          </button>
          <span className="app-topbar__brand">TeamMatchUp</span>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
