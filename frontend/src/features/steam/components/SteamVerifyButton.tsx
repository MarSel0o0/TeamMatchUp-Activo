import { ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { env } from '@/config/env';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { SENDING_TEXT, STEAM_MOCK_DISABLED_TEXT, STEAM_VERIFY_LABEL } from '@/shared/utils/copy';
import { useStartSteamVerification, useSteamAvailability } from '../hooks';

/**
 * «Verificar con Steam» (spec 013, RF-2, RF-21, RF-22). Quien lo pone decide dónde y solo cuando
 * corresponde (cuenta de CS2 sin verificar o sin cuenta de CS2): aquí se decide si se ofrece.
 * - Modo simulado: desactivado, con el texto que lo explica; nunca se simula una verificación.
 * - Instancia sin la clave de Steam, o sin respuesta todavía: no se muestra nada.
 */
export function SteamVerifyButton() {
  const availability = useSteamAvailability();
  const start = useStartSteamVerification();
  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado.
  const sending = useRef(false);

  if (env.useMockApi) {
    return (
      <div className="stack">
        <button type="button" className="btn btn--sm" disabled aria-describedby="steam-mock-note">
          <Icon as={ShieldCheck} size={13} />
          {STEAM_VERIFY_LABEL}
        </button>
        <span id="steam-mock-note" className="note note--faint">
          {STEAM_MOCK_DISABLED_TEXT}
        </span>
      </div>
    );
  }

  if (availability.data?.available !== true) return null;

  const busy = start.isPending || start.isSuccess;
  const handleClick = () => {
    if (sending.current) return;
    sending.current = true;
    start.mutate(undefined, { onError: () => (sending.current = false) });
  };

  return (
    <div className="stack">
      <button type="button" className="btn btn--sm" onClick={handleClick} disabled={busy}>
        {busy ? <span className="btn__spin" /> : <Icon as={ShieldCheck} size={13} />}
        {busy ? SENDING_TEXT : STEAM_VERIFY_LABEL}
      </button>
      <MutationNotice error={start.error} />
    </div>
  );
}
