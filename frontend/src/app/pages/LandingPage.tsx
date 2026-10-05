import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { SignUpSheetPreview } from '@/app/layouts/SignUpSheetPreview';
import { intersectBlocks, toBlock } from '@/domain/availability';
import { GAME_LIST } from '@/domain/games';
import type { TimeBlock, WeekDay } from '@/domain/types';
import { BrandMark } from '@/shared/components/BrandMark';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Magnetic } from '@/shared/motion/Magnetic';
import { EASE_OUT, rise, stagger } from '@/shared/motion/presets';
import { Reveal } from '@/shared/motion/Reveal';
import { CrossingVisual } from './CrossingVisual';
import './landing.css';

/** Disponibilidades de muestra para enseñar el traslape. No son usuarios reales. */
const range = (day: WeekDay, from: number, to: number): TimeBlock[] =>
  Array.from({ length: to - from }, (_, index) => toBlock(day, (from + index) % 24));

const SAMPLE_MINE: TimeBlock[] = [
  ...range(0, 20, 24),
  ...range(2, 19, 23),
  ...range(4, 21, 26),
  ...range(5, 15, 19),
];
const SAMPLE_THEIRS: TimeBlock[] = [
  ...range(0, 22, 25),
  ...range(2, 18, 21),
  ...range(3, 20, 23),
  ...range(5, 16, 21),
];
const SAMPLE_SHARED = intersectBlocks(SAMPLE_MINE, SAMPLE_THEIRS);

const HEADLINE: { word: string; hl?: boolean }[] = [
  { word: 'Juega' },
  { word: 'con' },
  { word: 'gente' },
  { word: 'de' },
  { word: 'tu' },
  { word: 'nivel,' },
  { word: 'a', hl: true },
  { word: 'tu', hl: true },
  { word: 'hora.', hl: true },
];

export default function LandingPage() {
  useDocumentTitle('Juega con gente de tu nivel');
  const reduce = useReducedMotion();

  return (
    <div className="landing">
      <header className="landing__top">
        <nav className="landing__nav glass" aria-label="Principal">
          <Link to={ROUTES.landing} className="landing__brand" aria-label="TeamMatchUp">
            <BrandMark size={30} animated />
            <span>TeamMatchUp</span>
          </Link>
          <div className="line landing__actions">
            <ThemeToggle />
            <Link to={ROUTES.login} className="btn btn--quiet btn--sm">
              Entrar
            </Link>
            <Link to={ROUTES.register} className="btn btn--pen btn--sm">
              Crear cuenta
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ------------------------------------------------------------ Hero */}
        <section className="hero">
          <motion.div
            className="hero__copy"
            initial="hidden"
            animate="show"
            variants={stagger(0.08, 0.1)}
          >
            <motion.span className="hero__eyebrow" variants={rise}>
              <span className="hero__pulse" />
              League of Legends · Rainbow Six Siege · CS2
            </motion.span>

            <h1 className="doc-title doc-title--xl hero__title">
              {/* El espacio va fuera de la ranura: dentro de un inline-block
                  recortado, el espacio final se pierde y las palabras se pegan. */}
              {HEADLINE.map(({ word, hl }, index) => (
                <Fragment key={index}>
                  <span className="hero__word">
                    <motion.span
                      className={hl ? 'hl' : undefined}
                      initial={reduce ? false : { y: '110%' }}
                      animate={{ y: '0%' }}
                      transition={{ duration: 0.9, delay: 0.15 + index * 0.055, ease: EASE_OUT }}
                    >
                      {word}
                    </motion.span>
                  </span>{' '}
                </Fragment>
              ))}
            </h1>

            <motion.p className="lead hero__lead" variants={rise}>
              Cruzamos tu rango verificado con tu horario semanal. Terminas con una sesión
              agendada, no con una lista de desconocidos.
            </motion.p>

            <motion.div className="hero__ctas" variants={rise}>
              <Magnetic>
                <Link to={ROUTES.register} className="btn btn--pen btn--lg">
                  Crear cuenta
                  <span className="btn__orb">
                    <Icon as={ArrowUpRight} size={18} />
                  </span>
                </Link>
              </Magnetic>
              <Link to={ROUTES.login} className="hero__secondary">
                Ya tengo cuenta
              </Link>
            </motion.div>
          </motion.div>

          <div className="hero__visual">
            <CrossingVisual />
          </div>
        </section>

        {/* --------------------------------------------------------- Marquee */}
        <div className="marquee" aria-label="Juegos soportados">
          <div className="marquee__track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="marquee__group" aria-hidden={copy === 1 || undefined}>
                {[...GAME_LIST, ...GAME_LIST].map((game, index) => (
                  <li key={`${game.id}-${index}`} className="marquee__item">
                    <span className="marquee__dot" style={{ background: game.accent }} />
                    <span>{game.name}</span>
                    <span className="marquee__source">rango desde {game.source}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------- Pasos */}
        <section className="steps" aria-labelledby="steps-title">
          <Reveal className="steps__intro">
            <h2 id="steps-title" className="doc-title">
              Tres condiciones. <em>Una sola hora.</em>
            </h2>
            <p className="lead">
              Discord y los foros resuelven una a la vez. Aquí se cruzan las tres antes de que
              escribas el primer mensaje.
            </p>
          </Reveal>

          <ol className="steps__stack">
            <li className="step" style={{ '--i': 0 } as CSSProperties}>
              <div className="step__card">
                <div className="step__copy">
                  <span className="step__num num">01</span>
                  <h3 className="step__title">Tu rango se lee, no se declara</h3>
                  <p className="step__body">
                    Vinculas tu Riot ID, Ubisoft ID o SteamID64 y leemos el nivel desde la fuente
                    de cada juego. Se vuelve a leer cuando cambia.
                  </p>
                </div>
                <RankDemo />
              </div>
            </li>

            <li className="step" style={{ '--i': 1 } as CSSProperties}>
              <div className="step__card">
                <div className="step__copy">
                  <span className="step__num num">02</span>
                  <h3 className="step__title">Tus horas se cruzan con las de otros</h3>
                  <p className="step__body">
                    Marcas tu semana arrastrando sobre la grilla. Encendemos solo los bloques que
                    compartes con jugadores de tu nivel.
                  </p>
                  <span className="note note--faint">Ejemplo con dos disponibilidades de muestra.</span>
                </div>
                <div className="step__visual step__visual--hours">
                  <HoursSheet value={SAMPLE_MINE} compareWith={SAMPLE_SHARED} readOnly compact />
                </div>
              </div>
            </li>

            <li className="step" style={{ '--i': 2 } as CSSProperties}>
              <div className="step__card">
                <div className="step__copy">
                  <span className="step__num num">03</span>
                  <h3 className="step__title">Termina en una partida</h3>
                  <p className="step__body">
                    Alguien publica el bloque y el resto se anota. Cuando los cupos se llenan, el
                    equipo está armado.
                  </p>
                </div>
                <div className="step__visual">
                  <SignUpSheetPreview />
                </div>
              </div>
            </li>
          </ol>
        </section>

        {/* ------------------------------------------------------ CTA final */}
        <section className="closing">
          <Reveal className="closing__inner" group>
            <motion.h2 className="doc-title doc-title--xl closing__title" variants={rise}>
              Deja de jugar <em>con desconocidos.</em>
            </motion.h2>
            <motion.div variants={rise}>
              <Magnetic>
                <Link to={ROUTES.register} className="btn btn--pen btn--lg">
                  Crear cuenta
                  <span className="btn__orb">
                    <Icon as={ArrowUpRight} size={18} />
                  </span>
                </Link>
              </Magnetic>
            </motion.div>
          </Reveal>
        </section>
      </main>

      <footer className="landing__foot">
        <span className="label">TeamMatchUp · 2026</span>
        <span className="note note--faint">
          Proyecto académico. Los datos que ves son de demostración.
        </span>
      </footer>
    </div>
  );
}

/**
 * Regla de rango de muestra: dos marcadores que se acercan hasta quedar a pocos
 * puntos. Se anima al entrar en pantalla.
 */
function RankDemo() {
  const reduce = useReducedMotion();
  const ticks = Array.from({ length: 11 }, (_, index) => index);

  return (
    <div className="step__visual rank-demo" aria-hidden="true">
      <div className="rank-demo__track">
        {ticks.map((tick) => (
          <span key={tick} className="rank-demo__tick" style={{ left: `${tick * 10}%` }} />
        ))}
        <motion.span
          className="rank-demo__fill"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        />
        {/* Los marcadores ocupan todo el ancho y se desplazan con transform:
            un x de 58% los deja en el 58% de la regla sin tocar el layout. */}
        <motion.span
          className="rank-demo__marker rank-demo__marker--you"
          initial={reduce ? false : { x: '20%' }}
          whileInView={{ x: '58%' }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        >
          <span className="rank-demo__pin">Tú</span>
        </motion.span>
        <motion.span
          className="rank-demo__marker"
          initial={reduce ? false : { x: '92%' }}
          whileInView={{ x: '64%' }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.1 }}
        >
          <span className="rank-demo__pin">Otro</span>
        </motion.span>
      </div>
      <div className="rank-demo__legend">
        <span className="label">Iron</span>
        <motion.span
          className="rank-demo__delta num"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          Δ 6 pts · compatibles
        </motion.span>
        <span className="label">Challenger</span>
      </div>
    </div>
  );
}
