import { AlertCircle } from 'lucide-react';
import { useId, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        {...inputProps}
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
}
