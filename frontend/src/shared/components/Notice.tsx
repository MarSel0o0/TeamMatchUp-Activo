import { Paper } from '@mantine/core';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export type NoticeTone = 'neutral' | 'pen' | 'error';

interface NoticeProps extends Omit<ComponentPropsWithoutRef<'p'>, 'color'> {
  /** `error` = aviso de error, `pen` = informativo (volt), `neutral` = el resto. */
  tone?: NoticeTone;
  /**
   * Rol de hoy de cada aviso: `alert` en los errores que deben anunciarse al aparecer, `status` en los
   * avisos de estado y ninguno en el resto (RF-15). Sin `role`, el aviso no se anuncia por sí mismo.
   */
  role?: 'alert' | 'status';
}

/**
 * Aviso en línea (M13): el `Paper` de la librería con el aspecto de `theme/components/notice.css`. Se usa
 * `Paper` y no `Alert` porque `Alert` impone `role="alert"` y un `aria-describedby` propio (DT-5, RF-15).
 * El icono (si lo hay) y el texto son hijos directos, como siempre.
 */
export const Notice = forwardRef<HTMLParagraphElement, NoticeProps>(function Notice(
  { tone = 'neutral', className, children, ...rest },
  ref,
) {
  return (
    <Paper
      ref={ref}
      component="p"
      variant={tone}
      className={className ? `tmu-notice ${className}` : 'tmu-notice'}
      {...rest}
    >
      {children}
    </Paper>
  );
});
