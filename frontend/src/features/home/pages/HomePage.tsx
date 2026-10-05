import { ArrowUpRight, CalendarRange, Crosshair, FileUser } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { formatHour, WEEK_DAYS } from '@/domain/availability';
import { getGame } from '@/domain/games';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useAvailability } from '@/features/profile/hooks';
import { useSessions } from '@/features/sessions/hooks';
import { GameMark } from '@/shared/components/GameMark';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { CountUp } from '@/shared/motion/CountUp';
import { SPRING, rise, stagger } from '@/shared/motion/presets';
import './homePage.css';

/** Saludo según la hora local: el uso real ocurre de noche. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomePage() {
  useDocumentTitle('Inicio');
  const { user } = useAuth();
  const accounts = useAccounts().data ?? [];
  const availability = useAvailability().data ?? [];
  const sessions = useSessions('all').data ?? [];

  const mine = sessions
    .filter((session) => session.participants.some((participant) => participant.id === user?.id))
    .sort((a, b) => a.day - b.day || a.startHour - b.startHour);
  const next = mine[0];
  const firstName = user?.displayName.split(' ')[0] ?? '';

  return (
    <motion.div className="home" initial="hidden" animate="show" variants={stagger(0.08)}>
      <motion.header className="page-head" variants={rise}>
        <div className="page-head__copy">
          <span className="label">{greeting()}</span>
          <h1 className="doc-title home__title">
            {firstName ? (
              <>
                {firstName}, <em>¿a qué hora juegas hoy?</em>
              </>
            ) : (
              '¿A qué hora juegas hoy?'
            )}
          </h1>
        </div>
      </motion.header>

      <div className="bento">
        {/* Agenda: la superficie insignia, la más grande del tablero. */}
        <motion.div className="bento__cell bento__cell--agenda sheet sheet--punched" variants={rise} whileHover={{ y: -4 }} transition={SPRING}>
          <Link to={ROUTES.schedule} className="bento__link" aria-label="Abrir la agenda" />
          <div className="bento__top">
            <span className="bento__icon">
              <Icon as={CalendarRange} size={18} />
            </span>
            <span className="bento__arrow">
              <Icon as={ArrowUpRight} size={18} />
            </span>
          </div>
          <div className="bento__copy">
            <h2 className="bento__title">Agenda de la semana</h2>
            {next ? (
              <p className="note">
                Tu próxima sesión:{' '}
                <strong className="home__next">
                  {next.title} · {WEEK_DAYS[next.day].label} {formatHour(next.startHour)}
                </strong>
              </p>
            ) : (
              <p className="note">Publica un bloque o súmate a uno abierto para cerrar la partida.</p>
            )}
          </div>
          <div className="bento__stats">
            <div>
              <CountUp value={sessions.length} className="bento__big" />
              <span className="label">sesiones abiertas</span>
            </div>
            <div>
              <CountUp value={mine.length} className="bento__big bento__big--volt" />
              <span className="label">en las que estás</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="bento__cell bento__cell--hours sheet" variants={rise} whileHover={{ y: -4 }} transition={SPRING}>
          <Link to={ROUTES.settings} className="bento__link" aria-label="Editar mis horas" />
          <div className="bento__top">
            <div>
              <h2 className="bento__title">Mis horas</h2>
              <p className="note note--faint">
                <CountUp value={availability.length} /> horas declaradas por semana
              </p>
            </div>
            <span className="bento__arrow">
              <Icon as={ArrowUpRight} size={18} />
            </span>
          </div>
          <div className="bento__heat">
            <HoursSheet value={availability} readOnly compact />
          </div>
        </motion.div>

        <motion.div className="bento__cell bento__cell--matches sheet" variants={rise} whileHover={{ y: -4 }} transition={SPRING}>
          <Link to={ROUTES.matches} className="bento__link" aria-label="Ver coincidencias" />
          <div className="bento__top">
            <span className="bento__icon">
              <Icon as={Crosshair} size={18} />
            </span>
            <span className="bento__arrow">
              <Icon as={ArrowUpRight} size={18} />
            </span>
          </div>
          <div className="bento__copy">
            <h2 className="bento__title">Coincidencias</h2>
            <p className="note">Jugadores de tu nivel con horas que se cruzan con las tuyas.</p>
          </div>
        </motion.div>

        <motion.div className="bento__cell bento__cell--profile sheet" variants={rise} whileHover={{ y: -4 }} transition={SPRING}>
          <Link to={ROUTES.profile} className="bento__link" aria-label="Abrir mi ficha" />
          <div className="bento__top">
            <span className="bento__icon">
              <Icon as={FileUser} size={18} />
            </span>
            <span className="bento__arrow">
              <Icon as={ArrowUpRight} size={18} />
            </span>
          </div>
          <div className="bento__copy">
            <h2 className="bento__title">Mi ficha</h2>
            {accounts.length ? (
              <div className="wrap">
                {accounts.map((account) => (
                  <span
                    key={account.id}
                    className="home__account"
                    style={{ borderColor: getGame(account.gameId).accent }}
                  >
                    <GameMark gameId={account.gameId} />
                    {account.verified ? <span className="home__check">verificado</span> : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="note">Todavía no vinculas ningún juego.</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
