import { AlertCircle, Link2 } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { GAME_LIST, getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { AppButton } from '@/shared/components/AppButton';
import { Notice } from '@/shared/components/Notice';
import { SelectField } from '@/shared/components/SelectField';
import { Spinner } from '@/shared/components/Spinner';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { TextField } from '@/shared/components/TextField';
import { SENDING_TEXT } from '@/shared/utils/copy';
import { useLinkAccount } from '../hooks';

interface LinkAccountFormProps {
  /** Juegos ya vinculados: no se vuelven a ofrecer. */
  linkedGames: GameId[];
  onLinked?: () => void;
  /**
   * Se pinta sobre los campos cuando el juego elegido es LoL (spec 014, RF-39): «Verificar con
   * Riot Games» convive con el vínculo manual, que no cambia.
   */
  aboveLol?: ReactNode;
  /**
   * Se pinta sobre los campos cuando el juego elegido es CS2 (spec 013, RF-2): «Verificar con Steam»
   * convive con el vínculo manual, que no cambia (RF-16).
   */
  aboveCs2?: ReactNode;
}

/**
 * Alta de una cuenta de juego. Solo se piden identificador y región: el rango lo
 * lee la plataforma y no se declara a mano (RF-15, sin nombrar fuentes).
 */
export function LinkAccountForm({ linkedGames, onLinked, aboveLol, aboveCs2 }: LinkAccountFormProps) {
  const available = useMemo(
    () => GAME_LIST.filter((game) => !linkedGames.includes(game.id)),
    [linkedGames],
  );

  const [gameId, setGameId] = useState<GameId>(available[0]?.id ?? 'lol');
  const [handle, setHandle] = useState('');
  const [region, setRegion] = useState(available[0]?.regions[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado (RF-20).
  const sending = useRef(false);

  const linkAccount = useLinkAccount();
  const game = getGame(gameId);

  if (available.length === 0) {
    return (
      <p className="note note--faint">
        Ya tienes vinculados los tres juegos que la plataforma soporta.
      </p>
    );
  }

  const changeGame = (nextGameId: GameId) => {
    setGameId(nextGameId);
    setRegion(getGame(nextGameId).regions[0]);
    setError(null);
    linkAccount.reset();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setError(null);

    if (!game.handlePattern.test(handle.trim())) {
      setError(`Ese ${game.handleLabel} no tiene el formato esperado (${game.handlePlaceholder}).`);
      return;
    }

    sending.current = true;
    try {
      await linkAccount.mutateAsync({ gameId, handle: handle.trim(), region });
      setHandle('');
      onLinked?.();
    } catch {
      // El error se muestra con `MutationNotice` desde el estado de la escritura (RF-9).
    } finally {
      sending.current = false;
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {error ? (
        <Notice tone="error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {error}
        </Notice>
      ) : null}
      <MutationNotice error={linkAccount.error} />

      <SelectField
        id="link-game"
        label="Juego"
        value={gameId}
        onChange={(value) => changeGame(value as GameId)}
        options={available.map((option) => ({ value: option.id, label: option.name }))}
      />

      {gameId === 'lol' ? aboveLol : null}
      {gameId === 'cs2' ? aboveCs2 : null}

      <TextField
        label={game.handleLabel}
        placeholder={game.handlePlaceholder}
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
      />

      <SelectField
        id="link-region"
        label="Región"
        value={region}
        onChange={(value) => setRegion(value)}
        options={game.regions.map((option) => ({ value: option, label: option }))}
      />

      <AppButton type="submit" tone="pen" disabled={linkAccount.isPending}>
        {linkAccount.isPending ? <Spinner /> : <Icon as={Link2} size={14} />}
        {linkAccount.isPending ? SENDING_TEXT : 'Vincular cuenta'}
      </AppButton>
    </form>
  );
}
