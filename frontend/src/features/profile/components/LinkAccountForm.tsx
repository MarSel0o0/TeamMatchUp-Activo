import { AlertCircle, Link2 } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { GAME_LIST, getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { TextField } from '@/shared/components/TextField';
import { SENDING_TEXT } from '@/shared/utils/copy';
import { useLinkAccount } from '../hooks';

interface LinkAccountFormProps {
  /** Juegos ya vinculados: no se vuelven a ofrecer. */
  linkedGames: GameId[];
  onLinked?: () => void;
}

/**
 * Alta de una cuenta de juego. Solo se piden identificador y región: el rango lo
 * lee la plataforma y no se declara a mano (RF-15, sin nombrar fuentes).
 */
export function LinkAccountForm({ linkedGames, onLinked }: LinkAccountFormProps) {
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
        <p className="notice notice--error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {error}
        </p>
      ) : null}
      <MutationNotice error={linkAccount.error} />

      <div className="field">
        <label className="label" htmlFor="link-game">
          Juego
        </label>
        <select
          id="link-game"
          className="select"
          value={gameId}
          onChange={(event) => changeGame(event.target.value as GameId)}
        >
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label={game.handleLabel}
        placeholder={game.handlePlaceholder}
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
      />

      <div className="field">
        <label className="label" htmlFor="link-region">
          Región
        </label>
        <select
          id="link-region"
          className="select"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          {game.regions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn btn--pen" disabled={linkAccount.isPending}>
        {linkAccount.isPending ? <span className="btn__spin" /> : <Icon as={Link2} size={14} />}
        {linkAccount.isPending ? SENDING_TEXT : 'Vincular cuenta'}
      </button>
    </form>
  );
}
