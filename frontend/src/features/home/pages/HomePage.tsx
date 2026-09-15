import { Link } from 'react-router-dom';
import { CalendarRange, Crosshair, FileUser } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/useAuth';
import { Icon } from '@/shared/components/Icon';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import '@/app/pages/landing.css';

export default function HomePage() {
  useDocumentTitle('Inicio - TeamMatchUp');
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  };

  return (
    <motion.div
      className="sheet sheet--punched"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <header className="sheet__head">
        <motion.div className="stack-sm" variants={item}>
          <h1 className="sheet-title">Expediente Central</h1>
          <span className="label">Bienvenido/a, {user?.displayName ?? 'Agente'}</span>
        </motion.div>
      </header>

      <div className="sheet__body">
        <motion.p className="lead" variants={item}>
          Tu perfil está operativo. Desde aquí puedes revisar tus coincidencias de rango,
          gestionar tu disponibilidad semanal y acceder a tus partidas agendadas.
        </motion.p>

        <motion.hr className="rule" variants={item} />

        <motion.div className="landing__features" style={{ padding: 0, border: 'none' }} variants={container}>
          <motion.article className="feature-box" variants={item}>
            <div className="line">
              <Icon as={FileUser} size={20} />
              <h2 className="feature-box__title" style={{ fontSize: 'var(--t-base)' }}>Tu Ficha</h2>
            </div>
            <p className="feature-box__body">
              Actualiza los juegos vinculados y revisa tu rango actual registrado por el sistema.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 'var(--s3)' }}>
              <Link to={ROUTES.profile} className="btn btn--quiet btn--sm">
                Ir a mi ficha
              </Link>
            </div>
          </motion.article>

          <motion.article className="feature-box" variants={item}>
            <div className="line">
              <Icon as={Crosshair} size={20} />
              <h2 className="feature-box__title" style={{ fontSize: 'var(--t-base)' }}>Coincidencias</h2>
            </div>
            <p className="feature-box__body">
              Busca perfiles de tu mismo nivel que compartan bloques horarios contigo.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 'var(--s3)' }}>
              <Link to={ROUTES.matches} className="btn btn--quiet btn--sm">
                Ver coincidencias
              </Link>
            </div>
          </motion.article>

          <motion.article className="feature-box" variants={item}>
            <div className="line">
              <Icon as={CalendarRange} size={20} />
              <h2 className="feature-box__title" style={{ fontSize: 'var(--t-base)' }}>Agenda</h2>
            </div>
            <p className="feature-box__body">
              Firma bloques de tiempo o anótate en sesiones publicadas para cerrar la partida.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: 'var(--s3)' }}>
              <Link to={ROUTES.schedule} className="btn btn--pen btn--sm">
                Abrir agenda
              </Link>
            </div>
          </motion.article>
        </motion.div>
      </div>
    </motion.div>
  );
}
