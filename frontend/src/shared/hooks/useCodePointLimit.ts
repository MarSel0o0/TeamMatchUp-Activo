import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from 'react';
import { limitToCodePoints, type TextSelection } from '@/domain/sessionRules';

type TextElement = HTMLInputElement | HTMLTextAreaElement;

interface CodePointLimitOptions {
  value: string;
  onValueChange: (value: string) => void;
  /** Máximo en puntos de código (título 60, notas 160). */
  max: number;
}

function readSelection(element: TextElement): TextSelection | null {
  const { selectionStart, selectionEnd } = element;
  return selectionStart === null || selectionEnd === null
    ? null
    : { start: selectionStart, end: selectionEnd };
}

/**
 * Puente entre `limitToCodePoints` y un campo de texto controlado (spec 009, plan 4.7, D-30).
 * No tiene reglas propias: guarda la selección previa a cada cambio y aplica la regla en
 * `onChange` y, durante una composición (IME), en `compositionend`.
 */
export function useCodePointLimit<T extends TextElement>({
  value,
  onValueChange,
  max,
}: CodePointLimitOptions) {
  const elementRef = useRef<T | null>(null);
  const previousSelection = useRef<TextSelection | null>(null);
  const composition = useRef<{ previous: string; selection: TextSelection | null } | null>(null);
  const [cursorRequest, setCursorRequest] = useState<{ selection: TextSelection } | null>(null);

  // `beforeinput` nativo: se dispara antes de que el DOM cambie, así que la selección es la de antes.
  const handleBeforeInput = useCallback((event: Event) => {
    const element = elementRef.current;
    if (element === null || (event as InputEvent).isComposing) return;
    previousSelection.current = readSelection(element);
  }, []);

  const ref = useCallback(
    (element: T | null) => {
      elementRef.current?.removeEventListener('beforeinput', handleBeforeInput);
      elementRef.current = element;
      element?.addEventListener('beforeinput', handleBeforeInput);
    },
    [handleBeforeInput],
  );

  const apply = (previous: string, next: string, selection: TextSelection | null) => {
    const limited = limitToCodePoints({ previous, next, selection }, max);
    onValueChange(limited.value);
    // Objeto nuevo en cada petición: fuerza el render aunque el valor no cambie.
    if (limited.selection) setCursorRequest({ selection: limited.selection });
  };

  const onChange = (event: ChangeEvent<T>) => {
    if ((event.nativeEvent as InputEvent).isComposing) {
      onValueChange(event.target.value);
      return;
    }
    const selection = previousSelection.current;
    previousSelection.current = null;
    apply(value, event.target.value, selection);
  };

  const onCompositionStart = () => {
    const element = elementRef.current;
    composition.current = {
      previous: value,
      selection: element === null ? null : readSelection(element),
    };
  };

  const onCompositionEnd = (event: CompositionEvent<T>) => {
    const started = composition.current;
    composition.current = null;
    if (started === null) return;
    apply(started.previous, event.currentTarget.value, started.selection);
  };

  useLayoutEffect(() => {
    if (cursorRequest === null) return;
    elementRef.current?.setSelectionRange(cursorRequest.selection.start, cursorRequest.selection.end);
  }, [cursorRequest]);

  return { ref, onChange, onCompositionStart, onCompositionEnd };
}
