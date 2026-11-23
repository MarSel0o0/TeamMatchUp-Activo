import { NativeSelect } from '@mantine/core';
import { useId } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps {
  /** Identificador estable del campo (la etiqueta y las pruebas lo usan). */
  id?: string;
  label: string;
  value: string | number;
  /** Recibe el valor elegido como texto; quien llama lo convierte si es un número. */
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** Clase del contenedor, por ejemplo `grow` en una fila de dos listas. */
  className?: string;
}

/**
 * Lista desplegable (M7): la lista nativa del navegador (`NativeSelect`, decisión P1) con etiqueta, las
 * mismas opciones y el mismo orden, y el aspecto de `theme/components/field.css`.
 */
export function SelectField({ id, label, value, onChange, options, className }: SelectFieldProps) {
  const generatedId = useId();
  return (
    <NativeSelect
      id={id ?? generatedId}
      label={label}
      value={String(value)}
      onChange={(event) => onChange(event.currentTarget.value)}
      data={options.map((option) => ({ value: String(option.value), label: option.label }))}
      className={className}
    />
  );
}
