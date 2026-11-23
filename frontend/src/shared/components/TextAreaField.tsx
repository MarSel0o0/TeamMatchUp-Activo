import { Textarea } from '@mantine/core';
import type { ChangeEventHandler, CompositionEventHandler, ReactNode, Ref } from 'react';

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  /** Límite del navegador (`maxlength`, en unidades de texto): «Cómo juegas», 200. */
  maxLength?: number;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  /** Límite en puntos de código (`useCodePointLimit`): trae el `ref`, el `onChange` y los eventos de composición. */
  limit?: {
    ref: Ref<HTMLTextAreaElement>;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
    onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
    onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
  };
  /** Texto bajo el campo que no está ligado a él (por ejemplo, el contador «n/200 caracteres»). */
  footer?: ReactNode;
}

/**
 * Área de texto (M5): el `Textarea` de la librería, sin alto automático (cambio de alto manual), con
 * etiqueta y el aspecto de `theme/components/field.css`. El pie, si lo hay, no está ligado al campo.
 */
export function TextAreaField({ id, label, value, placeholder, maxLength, onChange, limit, footer }: TextAreaFieldProps) {
  const field = (
    <Textarea
      id={id}
      label={label}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={onChange}
      {...limit}
    />
  );
  return footer ? (
    <div className="tmu-field-group">
      {field}
      {footer}
    </div>
  ) : (
    field
  );
}
