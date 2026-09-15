import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ROUTES } from '../routes';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');

  return (
    <div className="empty-state" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <span className="empty-state__icon" aria-hidden="true">
        🧭
      </span>
      <div className="stack-sm">
        <h1 className="page-title">Esta página no existe</h1>
        <p className="muted">Puede que el enlace esté mal escrito o que la vista se haya movido.</p>
      </div>
      <Link className="btn btn--primary" to={ROUTES.profile}>
        Volver a mi perfil
      </Link>
    </div>
  );
}
