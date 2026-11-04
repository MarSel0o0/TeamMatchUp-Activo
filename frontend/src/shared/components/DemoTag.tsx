import { SIMULATED_LABEL } from '../utils/copy';

/**
 * Etiqueta de datos simulados (RF-11, RF-15, RF-22). Única forma de mostrar la marca:
 * el texto sale de `SIMULATED_LABEL` y el aspecto, de las clases `note` existentes.
 */
export function DemoTag({ className }: { className?: string }) {
  const classes = className ? `note note--faint ${className}` : 'note note--faint';
  return <span className={classes}>{SIMULATED_LABEL}</span>;
}
