import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { SignUpSheetPreview } from '@/app/layouts/SignUpSheetPreview';
import { Stamp } from '@/shared/components/Stamp';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import './landing.css';

export default function LandingPage() {
  useDocumentTitle('TeamMatchUp - El cruce es el producto');
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
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
  };

  return (
    <div className="landing">
      <nav className="landing__nav">
        <Link to={ROUTES.home} className="label" style={{ color: 'inherit', textDecoration: 'none' }}>TeamMatchUp</Link>
        <div className="line">
          <Link to={ROUTES.login} className="btn btn--quiet btn--sm">
            Entrar
          </Link>
          <Link to={ROUTES.register} className="btn btn--pen btn--sm">
            Crear ficha
          </Link>
        </div>
      </nav>

      <motion.header
        className="landing__hero"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="landing__copy">
          <motion.div className="stack-sm" variants={item}>
            <h1 className="doc-title doc-title--xl">El cruce es el producto</h1>
            <p className="lead">
              Cruza tres condiciones que ninguna otra herramienta resuelve junta: el mismo título,
              un nivel competitivo similar y disponibilidad horaria coincidente. No más
              emparejamiento automático con desconocidos.
            </p>
          </motion.div>

          <motion.div className="line" style={{ marginTop: 'var(--s2)' }} variants={item}>
            <Link to={ROUTES.register} className="btn btn--pen">
              Abrir expediente
            </Link>
            <Stamp tone="sealed" flat>
              OPERATIVO
            </Stamp>
          </motion.div>
        </div>

        <motion.div className="landing__visual" variants={item}>
          <SignUpSheetPreview />
        </motion.div>
      </motion.header>

      <motion.section
        className="landing__features"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.article className="feature-box" variants={item}>
          <h2 className="feature-box__title">Rango sellado</h2>
          <hr className="rule" />
          <p className="feature-box__body">
            El nivel se obtiene desde la fuente oficial de cada juego —no lo declaras tú— y se
            vuelve a leer de manera periódica. La verificación es lo que separa esto de un mensaje
            en un foro.
          </p>
        </motion.article>

        <motion.article className="feature-box" variants={item}>
          <h2 className="feature-box__title">Grilla semanal</h2>
          <hr className="rule" />
          <p className="feature-box__body">
            Marcas tu disponibilidad por bloques de una hora. El sistema busca exactamente los
            bloques que compartes con otros jugadores de tu mismo nivel. Rango sin horario es
            información inútil.
          </p>
        </motion.article>

        <motion.article className="feature-box" variants={item}>
          <h2 className="feature-box__title">Sesión agendada</h2>
          <hr className="rule" />
          <p className="feature-box__body">
            El flujo no termina en una lista de compatibles: termina en una partida. Alguien publica
            el bloque, el resto se anota debajo. El trámite acaba con el equipo completo y el
            servidor elegido.
          </p>
        </motion.article>
      </motion.section>

      <footer className="sheet__foot" style={{ marginTop: 'auto' }}>
        <span className="label">TeamMatchUp © 2026</span>
        <span>Demostración de flujo. Sin datos reales.</span>
      </footer>
    </div>
  );
}
