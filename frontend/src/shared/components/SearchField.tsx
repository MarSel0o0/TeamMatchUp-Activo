import { TextInput } from '@mantine/core';
import { Search } from 'lucide-react';
import type { ChangeEventHandler } from 'react';
import { Icon } from './Icon';

interface SearchFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}

/** Campo de búsqueda con icono (M6): `type="search"`, píldora, con el aspecto de `field.css`. */
export function SearchField({ id, label, placeholder, value, onChange, disabled }: SearchFieldProps) {
  return (
    <TextInput
      id={id}
      className="tmu-field--search"
      type="search"
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      leftSection={<Icon as={Search} size={14} />}
    />
  );
}
