import { TextInput } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { useCodePointLimit } from '../hooks/useCodePointLimit';
import { Icon } from './Icon';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  hint?: string;
  /**
   * Límite de escritura en puntos de código (spec 009, RF-24). Con él, el campo es controlado
   * por `value` y avisa los cambios por `onValueChange` (en lugar de `onChange`).
   */
  maxCodePoints?: number;
  onValueChange?: (value: string) => void;
}

/**
 * Campo de texto (M4): el `TextInput` de la librería con etiqueta, error anunciado, pista y límite de
 * caracteres Unicode, y el aspecto de `theme/components/field.css`. Con error, el campo queda descrito por el
 * error; sin él, por la pista (si la hay), como siempre.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, id, maxCodePoints, onValueChange, ...inputProps },
  forwardedRef,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const limit = useCodePointLimit<HTMLInputElement>({
    value: typeof inputProps.value === 'string' ? inputProps.value : '',
    onValueChange: (value) => onValueChange?.(value),
    max: maxCodePoints ?? Number.MAX_SAFE_INTEGER,
  });
  const limited = maxCodePoints !== undefined;

  const setRefs = (element: HTMLInputElement | null) => {
    if (limited) limit.ref(element);
    if (typeof forwardedRef === 'function') forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  };

  return (
    <TextInput
      {...inputProps}
      {...(limited
        ? {
            onChange: limit.onChange,
            onCompositionStart: limit.onCompositionStart,
            onCompositionEnd: limit.onCompositionEnd,
          }
        : {})}
      ref={setRefs}
      id={fieldId}
      label={label}
      description={error ? undefined : hint}
      error={
        error ? (
          <>
            <Icon as={AlertCircle} size={12} />
            {error}
          </>
        ) : undefined
      }
      errorProps={{ role: 'alert' }}
    />
  );
});
