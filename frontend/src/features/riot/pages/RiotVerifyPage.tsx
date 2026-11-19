import { ArrowLeft, CheckCircle2, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { getGame } from '@/domain/games';
import {
  ddragonIconUrl,
  formatCountdown,
  isChallengeTerminalError,
} from '@/domain/riotDisplay';
import type { GameAccount, RiotChallenge } from '@/domain/types';
import { useAccounts } from '@/features/profile/hooks';
import { ApiError } from '@/services/api';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { Failure, SheetSkeleton } from '@/shared/components/States';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
  RIOT_BACK_BUTTON,
  RIOT_CHALLENGE_EXPIRED_TITLE,
  RIOT_CHALLENGE_STEPS,
  RIOT_CONFIRM_BUTTON,
  RIOT_RETRY_CHALLENGE_BUTTON,
  RIOT_VERIFIED_NOTICE,
  RIOT_VERIFY_LABEL,
  SENDING_TEXT,
  riotIconFallbackText,
} from '@/shared/utils/copy';
import {
  useConfirmRiotChallenge,
  useCreateRiotChallenge,
  useCurrentRiotChallenge,
  useDdragonVersion,
} from '../hooks';
import { readRiotReturnPath } from '../notice';
import './riotVerifyPage.css';

const LOL_GAME = getGame('lol');

/**
 * Página `/verificar/riot` (spec 014, RF-2, RF-6, RF-7, RF-27, RF-45, RF-46, RF-47, RF-54;
 * D77, D99, D100, D101, D103; O-2).
 *
 * Al montar o recargar recupera el desafío abierto con `GET /api/riot/challenges/current`:
 * - si el usuario ya tiene LoL verificada, redirige a `/perfil` (RF-6);
 * - si existe un desafío abierto, muestra su pantalla (RF-2, RF-45, D103);
 * - si no existe (o venció antes de recargar), muestra el formulario pre-rellenado (RF-46, D101).
 */
export default function RiotVerifyPage() {
  useDocumentTitle(RIOT_VERIFY_LABEL);

  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = readRiotReturnPath(location.state);

  const accountsQuery = useAccounts();
  const currentChallengeQuery = useCurrentRiotChallenge();
  const [createdChallenge, setCreatedChallenge] = useState<RiotChallenge | null>(null);

  const accounts = accountsQuery.data ?? [];
  const hasVerifiedLol = accounts.some((account) => account.gameId === 'lol' && account.verified);

  if (hasVerifiedLol) {
    return <Navigate to={ROUTES.profile} replace />;
  }

  const manualLol = accounts.find((account) => account.gameId === 'lol' && !account.verified);
  const activeChallenge = createdChallenge ?? currentChallengeQuery.data ?? null;
  const goBack = () => navigate(returnTo);

  return (
    <>
      <header className="page-head">
        <div className="page-head__copy">
          <h1 className="doc-title">{RIOT_VERIFY_LABEL}</h1>
          <p className="lead">
            Demuestra que la cuenta de League of Legends es tuya cambiando temporalmente tu ícono de
            invocador. Después de verificar puedes volver a tu ícono de siempre.
          </p>
        </div>
      </header>

      <section className="sheet sheet--punched riot-verify__sheet">
        {accountsQuery.isPending || currentChallengeQuery.isPending ? (
          <div className="sheet__body">
            <SheetSkeleton rows={4} height={48} />
          </div>
        ) : accountsQuery.isError ? (
          <>
            <Failure error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} />
            <div className="sheet__foot">
              <button type="button" className="btn" onClick={goBack}>
                <Icon as={ArrowLeft} size={14} />
                {RIOT_BACK_BUTTON}
              </button>
            </div>
          </>
        ) : currentChallengeQuery.isError && createdChallenge === null ? (
          <>
            <Failure
              error={currentChallengeQuery.error}
              onRetry={() => void currentChallengeQuery.refetch()}
            />
            <div className="sheet__foot">
              <button type="button" className="btn" onClick={goBack}>
                <Icon as={ArrowLeft} size={14} />
                {RIOT_BACK_BUTTON}
              </button>
            </div>
          </>
        ) : activeChallenge !== null ? (
          <RiotChallengeView
            key={`${activeChallenge.id}-${activeChallenge.expiresAt}`}
            challenge={activeChallenge}
            onChallengeCreated={setCreatedChallenge}
            onBack={goBack}
          />
        ) : (
          <RiotChallengeForm
            manualLol={manualLol}
            onChallengeCreated={setCreatedChallenge}
            onBack={goBack}
          />
        )}
      </section>
    </>
  );
}

interface RiotChallengeFormProps {
  manualLol?: GameAccount | undefined;
  onChallengeCreated: (challenge: RiotChallenge) => void;
  onBack: () => void;
}

/** Formulario de pedido de desafío (RF-46, RF-47): Riot ID y región pre-rellenados si hay cuenta manual. */
function RiotChallengeForm({ manualLol, onChallengeCreated, onBack }: RiotChallengeFormProps) {
  const initialRegion =
    manualLol && LOL_GAME.regions.includes(manualLol.region)
      ? manualLol.region
      : LOL_GAME.regions[0];

  const [riotId, setRiotId] = useState(manualLol?.handle ?? '');
  const [region, setRegion] = useState(initialRegion);
  const createChallenge = useCreateRiotChallenge();
  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado.
  const sending = useRef(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    createChallenge.mutate(
      { riotId, region },
      {
        onSuccess: (challenge) => onChallengeCreated(challenge),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  return (
    <>
      <div className="sheet__head">
        <h2 className="sheet-title">Indica tu cuenta de League of Legends</h2>
      </div>
      <form
        className="sheet__body stack riot-verify__form"
        onSubmit={handleSubmit}
        noValidate
      >
        <TextField
          label={LOL_GAME.handleLabel}
          placeholder={LOL_GAME.handlePlaceholder}
          value={riotId}
          onChange={(event) => setRiotId(event.target.value)}
          autoComplete="off"
        />

        <div className="field">
          <label className="label" htmlFor="riot-verify-region">
            Región
          </label>
          <select
            id="riot-verify-region"
            className="select"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            {LOL_GAME.regions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <MutationNotice error={createChallenge.error} />

        <div className="riot-verify__footer">
          <button type="submit" className="btn btn--pen" disabled={createChallenge.isPending}>
            {createChallenge.isPending ? (
              <span className="btn__spin" />
            ) : (
              <Icon as={ShieldCheck} size={14} />
            )}
            {createChallenge.isPending ? SENDING_TEXT : 'Pedir ícono de verificación'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onBack}
            disabled={createChallenge.isPending}
          >
            <Icon as={ArrowLeft} size={14} />
            {RIOT_BACK_BUTTON}
          </button>
        </div>
      </form>
    </>
  );
}

interface RiotChallengeViewProps {
  challenge: RiotChallenge;
  onChallengeCreated: (challenge: RiotChallenge) => void;
  onBack: () => void;
}

/**
 * Pantalla del desafío abierto (RF-2, RF-7, RF-27, RF-47, RF-54, D77, D99, D100).
 * Se monta con `key` único por desafío para reiniciar cuenta atrás, errores y estado terminal.
 */
function RiotChallengeView({ challenge, onChallengeCreated, onBack }: RiotChallengeViewProps) {
  const navigate = useNavigate();
  const ddragonQuery = useDdragonVersion();
  const confirmChallenge = useConfirmRiotChallenge();
  const retryChallenge = useCreateRiotChallenge();

  // La cuenta atrás parte de `remainingSeconds` y descuenta por tiempo transcurrido local (D100).
  const initialSeconds = Math.max(0, Math.ceil(challenge.remainingSeconds));
  const [startedAt] = useState(() => performance.now());
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [terminal, setTerminal] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const confirmSending = useRef(false);
  const retrySending = useRef(false);

  useEffect(() => {
    if (initialSeconds <= 0 || terminal) return;
    const tick = () => {
      const elapsed = Math.floor((performance.now() - startedAt) / 1000);
      const next = Math.max(0, initialSeconds - elapsed);
      setSecondsLeft(next);
      if (next <= 0) {
        window.clearInterval(timer);
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [initialSeconds, startedAt, terminal]);

  const expired = secondsLeft <= 0;
  const closed = expired || terminal;
  const version = ddragonQuery.data;
  const iconFallback = riotIconFallbackText(challenge.iconId);

  const handleConfirm = () => {
    if (closed || confirmSending.current || retrySending.current) return;
    confirmSending.current = true;
    confirmChallenge.mutate(challenge.id, {
      onSuccess: (result) => {
        navigate(ROUTES.profile, {
          replace: true,
          state: {
            riotNotice: {
              tone: 'ok',
              text: result.notice ?? RIOT_VERIFIED_NOTICE,
            },
          },
        });
      },
      onError: (error) => {
        if (error instanceof ApiError && isChallengeTerminalError(error.status, error.message)) {
          setTerminal(true);
        }
      },
      onSettled: () => {
        confirmSending.current = false;
      },
    });
  };

  const handleRetryChallenge = () => {
    if (retrySending.current || confirmSending.current) return;
    retrySending.current = true;
    retryChallenge.mutate(
      { riotId: challenge.riotId, region: challenge.region },
      {
        onSuccess: (nextChallenge) => {
          onChallengeCreated(nextChallenge);
        },
        onSettled: () => {
          retrySending.current = false;
        },
      },
    );
  };

  const busy = confirmChallenge.isPending || retryChallenge.isPending;

  return (
    <>
      <div className="sheet__head">
        <div className="riot-verify__account grow">
          <div className="stack-sm">
            <span className="label">Cuenta a verificar</span>
            <span className="riot-verify__account-id">{challenge.riotId}</span>
          </div>
          <span className="riot-verify__region">{challenge.region}</span>
        </div>
      </div>

      <div className="sheet__body stack">
        <div className="riot-verify__hero">
          <div className="riot-verify__icon-box">
            {version && !iconFailed ? (
              <img
                className="riot-verify__icon-img"
                src={ddragonIconUrl(version, challenge.iconId)}
                alt={iconFallback}
                width={88}
                height={88}
                onError={() => setIconFailed(true)}
              />
            ) : (
              <span className="riot-verify__icon-fallback num">{iconFallback}</span>
            )}
          </div>

          <div className="riot-verify__timer">
            <span className="label">Tiempo restante</span>
            <time
              className={`riot-verify__clock num${expired ? ' riot-verify__clock--expired' : ''}`}
              aria-live="off"
            >
              {formatCountdown(secondsLeft)}
            </time>
            <span className="note note--faint">
              El ícono asignado es uno de los íconos iniciales disponibles en todas las cuentas.
            </span>
          </div>
        </div>

        {expired ? (
          <p className="notice riot-verify__expired" role="status">
            <Icon as={Clock} size={15} />
            {RIOT_CHALLENGE_EXPIRED_TITLE}
          </p>
        ) : null}

        <div className="stack-sm">
          <span className="label">Cómo cambiar tu ícono</span>
          <ol className="riot-verify__steps">
            {RIOT_CHALLENGE_STEPS.map((step) => (
              <li key={step} className="riot-verify__step">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="riot-verify__actions">
          <div className="riot-verify__action-group">
            <button
              type="button"
              className={closed ? 'btn' : 'btn btn--pen'}
              onClick={handleConfirm}
              disabled={closed || busy}
            >
              {confirmChallenge.isPending ? (
                <span className="btn__spin" />
              ) : (
                <Icon as={CheckCircle2} size={14} />
              )}
              {confirmChallenge.isPending ? SENDING_TEXT : RIOT_CONFIRM_BUTTON}
            </button>
            <MutationNotice error={confirmChallenge.error} />
          </div>

          {closed ? (
            <div className="riot-verify__action-group">
              <button
                type="button"
                className="btn btn--pen"
                onClick={handleRetryChallenge}
                disabled={busy}
              >
                {retryChallenge.isPending ? (
                  <span className="btn__spin" />
                ) : (
                  <Icon as={RefreshCw} size={14} />
                )}
                {retryChallenge.isPending ? SENDING_TEXT : RIOT_RETRY_CHALLENGE_BUTTON}
              </button>
              <MutationNotice error={retryChallenge.error} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="sheet__foot">
        <button type="button" className="btn" onClick={onBack}>
          <Icon as={ArrowLeft} size={14} />
          {RIOT_BACK_BUTTON}
        </button>
      </div>
    </>
  );
}
