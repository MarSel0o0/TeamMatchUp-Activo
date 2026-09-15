import { Outlet } from 'react-router-dom';
import './authLayout.css';

/** Pantalla partida para registro e inicio de sesión. */
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <section className="auth-layout__pitch">
        <div className="auth-layout__brand">
          <img src="/logo.svg" alt="" width={34} height={34} />
          <span>TeamMatchUp</span>
        </div>

        <h1 className="auth-layout__headline">
          Deja de buscar equipo en el chat y empieza a jugar.
        </h1>
        <p className="auth-layout__lead">
          Cruzamos tu rango real y tus horarios para mostrarte jugadores con los que sí puedes
          coordinar una partida esta semana.
        </p>

        <ul className="auth-layout__points">
          <li>
            <strong>Rango verificado.</strong> Leemos tu nivel desde la fuente de cada juego y lo
            mantenemos al día.
          </li>
          <li>
            <strong>Horarios que calzan.</strong> Marcas tus bloques de la semana y el sistema busca
            traslapes reales.
          </li>
          <li>
            <strong>Agenda compartida.</strong> Publica una sesión, súmate a la de otro y concreta
            el encuentro.
          </li>
        </ul>

        <div className="auth-layout__games">
          <span className="badge">League of Legends</span>
          <span className="badge">Rainbow Six Siege</span>
          <span className="badge">Counter-Strike 2</span>
        </div>
      </section>

      <section className="auth-layout__form">
        <Outlet />
      </section>
    </div>
  );
}
