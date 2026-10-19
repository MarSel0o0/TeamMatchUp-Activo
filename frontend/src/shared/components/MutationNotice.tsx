import { AlertCircle } from 'lucide-react';
import { ApiError, isSessionCleared } from '@/services/api';
import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import { Icon } from './Icon';

interface MutationNoticeProps {
  /** Error de una escritura (`mutation.error`); `null` o `undefined` si no hay. */
  error: unknown;
  /** Lo envuelve en el cuerpo con relleno de una hoja, solo cuando hay un error que mostrar. */
  padded?: boolean;
}

/**
 * Texto que se muestra de un error de escritura (RF-9, RF-20): el mensaje del
 * servidor tal como llega y, en cualquier otro caso, el texto de error sin mensaje.
 */
function mutationErrorText(error: unknown): string {
  return error instanceof ApiError && error.hasMessage && error.message
    ? error.message
    : NO_MESSAGE_TEXT;
}

/**
 * Error de una escritura iniciada por el jugador. Se anuncia a un lector de
 * pantalla al aparecer (RNF-7) y no muestra nada si no hay error o si la
 * respuesta llegó después de limpiar la sesión del cliente (`SessionClearedError`).
 */
export function MutationNotice({ error, padded = false }: MutationNoticeProps) {
  if (error === null || error === undefined || isSessionCleared(error)) return null;

  const notice = (
    <p className="notice notice--error" role="alert">
      <Icon as={AlertCircle} size={15} />
      {mutationErrorText(error)}
    </p>
  );
  return padded ? <div className="sheet__body">{notice}</div> : notice;
}
