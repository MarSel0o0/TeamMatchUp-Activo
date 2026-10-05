import { LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/useAuth';
import { BrandMark } from '@/shared/components/BrandMark';
import { Icon } from '@/shared/components/Icon';
import { Monogram } from '@/shared/components/Monogram';
import { Working } from '@/shared/components/States';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { EASE_FLUID, EASE_OUT, SPRING, pageTransition } from '@/shared/motion/presets';
import { NAV_ITEMS, ROUTES } from '../routes';
import './appLayout.css';

/**
 * Marco de la aplicación.
 *
 * La navegación es una isla flotante, despegada del borde. La sección activa
 * se marca con una píldora que se desliza entre enlaces, y cada vista entra con
 * su propia transición: el cambio de sección se siente como un cambio de sala.
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <motion.header
        className="dock"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        <nav className="dock__island glass" aria-label="Principal">
          <NavLink to={ROUTES.home} className="dock__brand" aria-label="TeamMatchUp, inicio">
            <BrandMark size={30} />
            <span className="dock__brand-name">TeamMatchUp</span>
          </NavLink>

          <ul className="dock__links">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className="dock__link">
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          layoutId="dock-active"
                          className="dock__active"
                          transition={SPRING}
                        />
                      ) : null}
                      <Icon as={item.icon} size={15} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="dock__end">
            <ThemeToggle />
            {env.useMockApi ? (
              <span
                className="dock__demo"
                title="Nada de lo que ves proviene de Riot, Ubisoft o Steam todavía. Define VITE_API_URL para conectar el servidor."
              >
                Demo
              </span>
            ) : null}

            {user ? (
              <div className="dock__user">
                <Monogram name={user.displayName} color={user.avatarColor} size="sm" />
                <span className="dock__user-name">{user.displayName}</span>
                <button
                  type="button"
                  className="dock__icon-btn"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <Icon as={LogOut} size={15} label="Cerrar sesión" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="dock__burger"
              data-open={menuOpen || undefined}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              aria-label={menuOpen ? 'Cerrar el menú' : 'Abrir el menú'}
            >
              <span />
              <span />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="menu-movil"
            className="menu glass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: EASE_FLUID } }}
            transition={{ duration: 0.35, ease: EASE_FLUID }}
          >
            <motion.ul
              className="menu__links"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
            >
              {NAV_ITEMS.map((item) => (
                <motion.li
                  key={item.to}
                  className="menu__item"
                  variants={{
                    hidden: { y: 48, opacity: 0 },
                    show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
                  }}
                >
                  <NavLink to={item.to} className="menu__link">
                    <span className="menu__folio num">{item.folio}</span>
                    {item.label}
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>

            {user ? (
              <motion.div
                className="menu__foot"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.5, ease: EASE_OUT } }}
              >
                <div className="line">
                  <Monogram name={user.displayName} color={user.avatarColor} size="md" />
                  <span className="stack-sm" style={{ gap: 0 }}>
                    <strong>{user.displayName}</strong>
                    <span className="note note--faint">@{user.username}</span>
                  </span>
                </div>
                <button type="button" className="btn btn--sm" onClick={handleLogout}>
                  <Icon as={LogOut} size={13} />
                  Cerrar sesión
                </button>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main id="contenido" className="shell__main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="shell__page"
            variants={pageTransition}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            {/* Suspense propio: al cargar una vista diferida la isla de
                navegación sigue en pantalla. */}
            <Suspense fallback={<Working label="Cargando…" />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="shell__foot">
        <span className="label">TeamMatchUp · 2026</span>
        {env.useMockApi ? (
          <span className="note note--faint">
            Datos de demostración. Nada de lo que ves proviene de Riot, Ubisoft o Steam todavía.
          </span>
        ) : null}
      </footer>
    </div>
  );
}
