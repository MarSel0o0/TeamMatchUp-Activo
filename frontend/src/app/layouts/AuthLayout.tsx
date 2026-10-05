import { AnimatePresence, motion } from 'motion/react';
import { Suspense } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { BrandMark } from '@/shared/components/BrandMark';
import { Working } from '@/shared/components/States';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { EASE_OUT, rise, stagger } from '@/shared/motion/presets';
import { ROUTES } from '../routes';
import { SignUpSheetPreview } from './SignUpSheetPreview';
import './authLayout.css';

const CLAUSES = [
  {
    title: 'Rango leído, no declarado',
    body: 'Leemos tu nivel desde la fuente de cada juego y lo volvemos a leer cuando cambia.',
  },
  {
    title: 'Horas que se cruzan de verdad',
    body: 'Marcas tu semana y buscamos los bloques que compartes con otros.',
  },
  {
    title: 'Termina en una partida',
    body: 'Alguien publica el bloque y el resto se anota. Ahí se acaba el trámite.',
  },
];

/**
 * Puerta de entrada.
 *
 * Persuade mostrando el producto en vez de describirlo: salas con horas ya
 * tomadas por otros jugadores. El formulario vive en su propio panel y cambia
 * entre entrar y crear cuenta con una transición, sin salto de página.
 */
export function AuthLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="gate">
      <motion.section
        className="gate__pitch"
        initial="hidden"
        animate="show"
        variants={stagger(0.09, 0.05)}
      >
        <motion.div variants={rise}>
          <Link to={ROUTES.landing} className="gate__brand">
            <BrandMark size={32} animated />
            TeamMatchUp
          </Link>
        </motion.div>

        <motion.h1 className="doc-title gate__claim" variants={rise}>
          El equipo no se arma preguntando «¿alguien juega?». <em>Se arma tomando una hora.</em>
        </motion.h1>

        <motion.div variants={rise} className="gate__preview">
          <SignUpSheetPreview />
        </motion.div>

        <motion.dl className="gate__clauses" variants={stagger(0.08)}>
          {CLAUSES.map((clause, index) => (
            <motion.div key={clause.title} variants={rise}>
              <dt>
                <span className="num gate__clause-num">0{index + 1}</span>
                {clause.title}
              </dt>
              <dd>{clause.body}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </motion.section>

      <section className="gate__form">
        <div className="gate__corner">
          <ThemeToggle />
        </div>
        <div className="gate__shell">
          <div className="gate__core">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                <Suspense fallback={<Working label="Cargando…" />}>{outlet}</Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
