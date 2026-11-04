import { AlertCircle } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { useCodePointLimit } from '../hooks/useCodePointLimit';
import { Icon } from './Icon';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
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

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, id, maxCodePoints, onValueChange, ...inputProps },
  forwardedRef,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

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
    <div className="field">
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <input
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
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <span className="field__error" id={`${fieldId}-error`} role="alert">
          <Icon as={AlertCircle} size={12} />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});
