import { Slider } from '@mantine/core';
import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { dialName, pageStepValue } from '@/domain/dial';

interface SliderFieldProps {
  label: string;
  /** Unidad que se ve junto al valor y entra en el nombre accesible («pts», «h»). */
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Pista bajo el control; no está ligada a él (hoy tampoco). */
  hint?: string;
}

/**
 * Deslizador con etiqueta y valor (M9): el `Slider` de la librería con el aspecto de `theme/components/slider.css`.
 *  - Nombre accesible de la miniatura: el texto de la etiqueta con el valor y su unidad (`dialName`); el valor
 *    accesible es el número.
 *  - Teclado: flechas, Inicio y Fin los resuelve la librería; Re Pág y Av Pág, este envoltorio, con `pageStepValue`
 *    (la regla de la línea base), en captura y con el mismo `onChange` continuo.
 *  - Un clic en la etiqueta lleva el foco a la miniatura (como el `for` del `input` de siempre).
 *  - Deshabilitado, la miniatura de la librería sigue en el orden de Tab: se le quita con atributos.
 */
export function SliderField({ label, unit, value, min, max, step, onChange, disabled = false, hint }: SliderFieldProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // En cada render: la librería escribe `tabindex="0"` en la miniatura, estemos o no deshabilitados.
  useLayoutEffect(() => {
    const thumb = boxRef.current?.querySelector<HTMLElement>('[role="slider"]');
    if (!thumb) return;
    if (disabled) {
      thumb.setAttribute('tabindex', '-1');
      thumb.setAttribute('aria-disabled', 'true');
    } else {
      thumb.setAttribute('tabindex', '0');
      thumb.removeAttribute('aria-disabled');
    }
  });

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const next = pageStepValue(event.key, value, { min, max, step });
    if (next === null) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div className="field">
      <span
        className="label filters__dial"
        onClick={() => boxRef.current?.querySelector<HTMLElement>('[role="slider"]')?.focus()}
      >
        {label}
        <span className="num">
          {value} {unit}
        </span>
      </span>
      <div ref={boxRef} onKeyDownCapture={handleKeyDownCapture}>
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          label={null}
          thumbLabel={dialName(label, value, unit)}
          disabled={disabled}
        />
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}
