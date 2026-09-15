import { Outlet, Link } from 'react-router-dom';
import { ROUTES } from '../routes';
import { SignUpSheetPreview } from './SignUpSheetPreview';
import './authLayout.css';

/**
 * Puerta de entrada.
 *
 * Es la única superficie que persuade, y lo hace mostrando el producto en vez de
 * describirlo: una hoja con horas ya firmadas por otros jugadores. Lo que hay que
 * creer —hay gente real de tu nivel en horarios que te calzan— se demuestra en el
 * primer viewport.
 */
export function AuthLayout() {
  return (
    <div className="gate">
      <section className="gate__pitch">
        <div className="gate__masthead">
          <Link to={ROUTES.home} style={{ color: 'inherit', textDecoration: 'none' }}>
            <h1 className="doc-title doc-title--xl">TeamMatchUp</h1>
          </Link>
          <p className="gate__claim">
            El equipo no se arma preguntando «¿alguien juega?». Se arma firmando una hora.
          </p>
        </div>

        <SignUpSheetPreview />

        <dl className="gate__clauses">
          <div>
            <dt>Rango sellado, no declarado</dt>
            <dd>
              Leemos tu nivel desde la fuente de cada juego y lo volvemos a leer cuando cambia.
            </dd>
          </div>
          <div>
            <dt>Horas que se cruzan de verdad</dt>
            <dd>Marcas tu semana y el sistema busca los bloques que compartes con otros.</dd>
          </div>
          <div>
            <dt>Termina en una partida</dt>
            <dd>Alguien publica el bloque, el resto se anota debajo. Ahí se acaba el trámite.</dd>
          </div>
        </dl>
      </section>

      <section className="gate__form">
        <Outlet />
      </section>
    </div>
  );
}
