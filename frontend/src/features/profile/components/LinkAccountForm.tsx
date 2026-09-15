import { useMemo, useState, type FormEvent } from 'react';
import { GAME_LIST, getGame } from '@/domain/games';
import type { GameId } from '@/domain/types';
import { TextField } from '@/shared/components/TextField';
import { useLinkAccount } from '../hooks';

interface LinkAccountFormProps {
  /** Juegos que el usuario ya tiene vinculados: no se ofrecen de nuevo. */
  linkedGames: GameId[];
  onLinked?: () => void;
}

/**
 * Vinculación de una cuenta de juego. Solo se piden el identificador y la
 * región: el rango lo obtiene la plataforma desde la fuente externa.
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

  const linkAccount = useLinkAccount();
  const game = getGame(gameId);

  if (available.length === 0) {
    return (
      <p className="alert alert--success">
        Ya tienes vinculados los tres juegos disponibles. 🎉
      </p>
    );
  }

  const changeGame = (nextGameId: GameId) => {
    setGameId(nextGameId);
    setRegion(getGame(nextGameId).regions[0]);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!game.handlePattern.test(handle.trim())) {
      setError(`El ${game.handleLabel} no tiene el formato esperado (${game.handlePlaceholder}).`);
      return;
    }

    try {
      await linkAccount.mutateAsync({ gameId, handle: handle.trim(), region });
      setHandle('');
      onLinked?.();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : 'No se pudo vincular la cuenta.',
      );
    }
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {error ? <p className="alert">{error}</p> : null}

      <div className="field">
        <label className="field__label" htmlFor="link-game">
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
        hint={`Leeremos tu rango desde ${game.source}.`}
      />

      <div className="field">
        <label className="field__label" htmlFor="link-region">
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

      <button type="submit" className="btn btn--primary" disabled={linkAccount.isPending}>
        {linkAccount.isPending ? 'Vinculando…' : 'Vincular cuenta'}
      </button>
    </form>
  );
}
