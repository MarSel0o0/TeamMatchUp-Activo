import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/shared/components/BrandMark';
import { Icon } from '@/shared/components/Icon';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { rise, stagger } from '@/shared/motion/presets';
import { ROUTES } from '../routes';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');

  return (
    <motion.div
      className="blank"
      style={{ minHeight: '100dvh', justifyContent: 'center' }}
      initial="hidden"
      animate="show"
      variants={stagger(0.08)}
    >
      <motion.div variants={rise}>
        <BrandMark size={56} animated />
      </motion.div>
      <motion.span className="num" style={{ fontSize: '4.5rem', lineHeight: 1, color: 'var(--volt)' }} variants={rise}>
        404
      </motion.span>
      <motion.div className="stack-sm" variants={rise}>
        <h1 className="doc-title">No hay nadie en esta sala</h1>
        <p className="note note--faint">
          El enlace puede estar mal escrito, o la vista se movió a otra dirección.
        </p>
      </motion.div>
      <motion.div variants={rise}>
        <Link className="btn btn--pen" to={ROUTES.home}>
          <Icon as={ArrowLeft} size={15} />
          Volver al inicio
        </Link>
      </motion.div>
    </motion.div>
  );
}
