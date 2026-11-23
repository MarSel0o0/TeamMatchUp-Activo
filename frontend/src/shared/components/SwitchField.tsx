import { Switch } from '@mantine/core';
import type { ChangeEventHandler } from 'react';

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}

/**
 * Interruptor (M8): el `Switch` de la librería, con el aspecto de `theme/components/switch.css`. Se anuncia
 * como interruptor (rol `switch`) con su estado, cambia con Espacio y con un clic en el texto.
 */
export function SwitchField({ label, checked, onChange, disabled }: SwitchFieldProps) {
  return <Switch label={label} labelPosition="right" checked={checked} onChange={onChange} disabled={disabled} />;
}
