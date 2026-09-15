import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/components/Icon';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ROUTES } from '../routes';

export default function NotFoundPage() {
  useDocumentTitle('Hoja no encontrada');

  return (
    <div className="blank" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <span className="blank__mark">
        <Icon as={FileQuestion} size={30} />
      </span>
      <div className="stack-sm">
        <h1 className="doc-title">Esta hoja no existe</h1>
        <p className="note note--faint">
          El enlace puede estar mal escrito, o la vista se movió a otro folio.
        </p>
      </div>
      <Link className="btn btn--pen" to={ROUTES.profile}>
        Volver a mi ficha
      </Link>
    </div>
  );
}
