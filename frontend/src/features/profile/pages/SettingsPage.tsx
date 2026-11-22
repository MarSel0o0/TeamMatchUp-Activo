import { AlertCircle, Check, Save } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import { resolveUnlinkFocus, unlinkDialogTitle } from '@/domain/unlinkDialog';
import type { TimeBlock } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { AppButton } from '@/shared/components/AppButton';
import { Notice } from '@/shared/components/Notice';
import { Spinner } from '@/shared/components/Spinner';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { MutationNotice } from '@/shared/components/MutationNotice';
import { Stamp } from '@/shared/components/Stamp';
import { TextAreaField } from '@/shared/components/TextAreaField';
import { Failure, SheetSkeleton } from '@/shared/components/States';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { isSessionCleared } from '@/services/api';
import { REREAD_TEXT, SENDING_TEXT } from '@/shared/utils/copy';
import { pluralize } from '@/shared/utils/format';
import { RiotVerifyButton } from '@/features/riot/components/RiotVerifyButton';
import { SteamVerifyButton } from '@/features/steam/components/SteamVerifyButton';
import { AccountRow } from '../components/AccountRow';
import { UnlinkAccountDialog } from '../components/UnlinkAccountDialog';
import { LinkAccountForm } from '../components/LinkAccountForm';
import {
  useAccounts,
  useAvailability,
  useSaveAvailability,
  useSyncAccount,
  useUnlinkAccount,
  useUpdateProfile,
} from '../hooks';
import './settingsPage.css';

export default function SettingsPage() {
  useDocumentTitle('Configuración');

  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const saveAvailability = useSaveAvailability();
  const unlinkAccount = useUnlinkAccount();
  const syncAccount = useSyncAccount();
  const updateProfile = useUpdateProfile();

  const accounts = accountsQuery.data ?? [];

  /* --- Datos de la ficha -------------------------------------------------- */

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  // Cada escritura lleva una guarda propia: un doble clic envía una sola petición aunque el
  // estado de la escritura aún no se haya pintado (RF-20).
  const profileSending = useRef(false);
  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (profileSending.current) return;
    profileSending.current = true;
    updateProfile.mutate(
      { displayName: displayName.trim(), bio: bio.trim() },
      { onSettled: () => (profileSending.current = false) },
    );
  };

  /* --- Horas -------------------------------------------------------------- */

  // La grilla se pinta en local y se confirma con «Guardar»: así el usuario puede
  // marcar veinte bloques sin veinte peticiones.
  const [draftBlocks, setDraftBlocks] = useState<TimeBlock[] | null>(null);
  const blocks = draftBlocks ?? availabilityQuery.data ?? [];
  const pending =
    draftBlocks !== null &&
    JSON.stringify([...draftBlocks].sort()) !==
      JSON.stringify([...(availabilityQuery.data ?? [])].sort());

  const availabilitySending = useRef(false);
  const handleSaveAvailability = () => {
    if (!draftBlocks || availabilitySending.current) return;
    availabilitySending.current = true;
    // Si falla, el borrador se conserva y el error se muestra debajo (RF-9, RF-20).
    saveAvailability.mutate(draftBlocks, {
      onSuccess: () => setDraftBlocks(null),
      onSettled: () => (availabilitySending.current = false),
    });
  };

  // Resincronizar y desvincular comparten la guarda: mientras una está en curso no sale otra.
  const accountSending = useRef(false);
  const accountDone = () => (accountSending.current = false);

  const syncGame = (accountId: string) => {
    if (accountSending.current) return;
    accountSending.current = true;
    unlinkAccount.reset();
    syncAccount.mutate(accountId, { onSettled: accountDone });
  };

  // Desvincular con ventana de confirmación (spec 017, RF-23 a RF-25; plan 4.7). El estado es local: los almacenes de
  // la 016 no cambian. El título se calcula al abrir y no cambia aunque la lista de cuentas se vuelva a leer.
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ accountId: string; title: string } | null>(null);
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogConfirmRef = useRef<HTMLButtonElement>(null);
  const unlinkButtons = useRef(new Map<string, HTMLButtonElement>());
  const [focusRequest, setFocusRequest] = useState<{
    target: 'dialogTitle' | 'confirm' | 'sectionTitle' | 'rowButton';
    accountId?: string;
  } | null>(null);
  const unlinkButtonRef = useCallback(
    (accountId: string) => (element: HTMLButtonElement | null) => {
      if (element) unlinkButtons.current.set(accountId, element);
      else unlinkButtons.current.delete(accountId);
    },
    [],
  );
  useLayoutEffect(() => {
    if (focusRequest === null) return;
    const element =
      focusRequest.target === 'dialogTitle'
        ? dialogTitleRef.current
        : focusRequest.target === 'confirm'
          ? dialogConfirmRef.current
          : focusRequest.target === 'sectionTitle'
            ? sectionTitleRef.current
            : (unlinkButtons.current.get(focusRequest.accountId ?? '') ?? null);
    element?.focus();
  }, [focusRequest]);

  const unlinkGame = (accountId: string) => {
    if (accountSending.current) return;
    const account = accounts.find((candidate) => candidate.id === accountId);
    syncAccount.reset();
    unlinkAccount.reset();
    setUnlinkTarget({ accountId, title: unlinkDialogTitle(account ? account.handle : null) });
    setUnlinkOpen(true);
  };

  // Cierra sin enviar: el foco vuelve a «Desvincular» de la fila si sigue ahí; si no, al título de la sección.
  const closeUnlinkDialog = () => {
    if (unlinkAccount.isPending || !unlinkOpen || unlinkTarget === null) return;
    const button = unlinkButtons.current.get(unlinkTarget.accountId);
    const target = resolveUnlinkFocus('closedWithoutSending', {
      rowButtonFocusable: button !== undefined && !button.disabled && document.contains(button),
    });
    setUnlinkOpen(false);
    unlinkAccount.reset();
    if (target !== null) setFocusRequest({ target: target as 'rowButton' | 'sectionTitle', accountId: unlinkTarget.accountId });
  };

  const confirmUnlink = () => {
    if (accountSending.current || unlinkTarget === null) return;
    accountSending.current = true;
    syncAccount.reset();
    unlinkAccount.reset();
    setFocusRequest({ target: 'dialogTitle' }); // el botón queda deshabilitado (RF-25)
    unlinkAccount.mutate(unlinkTarget.accountId, {
      onSuccess: () => {
        setUnlinkOpen(false);
        setFocusRequest({ target: 'sectionTitle' });
      },
      onError: (error) => {
        // Un 401 lo resuelve la spec 007 (RF-7): la vista se va y no se devuelve el foco a ningún control.
        if (isSessionCleared(error)) return;
        setFocusRequest({ target: 'confirm' });
      },
      onSettled: accountDone,
    });
  };

  const accountsBusy = syncAccount.isPending || unlinkAccount.isPending;
  // El error de desvincular vive en la ventana, no encima de la lista (RF-25).
  const accountError = syncAccount.error;
  const syncNotice = syncAccount.isSuccess ? syncAccount.data.syncNotice : undefined;

  if (!user) return null;

  return (
    <>
      <header className="page-head">
        <div className="page-head__copy">
          <h1 className="doc-title">Configuración</h1>
          <p className="lead">
            Vincula los juegos que juegas y declara cuándo puedes jugar. Es lo que cruzamos con el
            resto.
          </p>
        </div>
      </header>

      <section className="sheet sheet--punched">
        <div className="sheet__head">
          <h2 className="sheet-title grow">Datos de la ficha</h2>
          {updateProfile.isSuccess ? (
            <Stamp tone="ok" pressKey={updateProfile.submittedAt}>
              <Icon as={Check} size={11} />
              Guardado
            </Stamp>
          ) : null}
        </div>

        <form className="sheet__body prefs__form" onSubmit={handleProfileSubmit}>
          <TextField
            label="Nombre visible"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <TextAreaField
            id="prefs-bio"
            label="Cómo juegas"
            maxLength={200}
            placeholder="Rol que prefieres, qué buscas en un equipo, cómo te comunicas…"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            footer={<span className="tmu-field__hint">{bio.length}/200 caracteres</span>}
          />

          <div className="line">
            <AppButton type="submit" tone="pen" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <Spinner /> : <Icon as={Save} size={14} />}
              {updateProfile.isPending ? SENDING_TEXT : 'Guardar ficha'}
            </AppButton>
            <span className="note note--faint settings__ident">
              {user.email} · {user.timezone}
            </span>
          </div>

          <MutationNotice error={updateProfile.error} />
        </form>
      </section>

      <div className="prefs__columns">
        <section className="sheet">
          <div className="sheet__head">
            <h2 ref={sectionTitleRef} tabIndex={-1} className="sheet-title grow">
              Cuentas vinculadas
            </h2>
            <span className="note note--faint">{REREAD_TEXT}</span>
          </div>

          {accountsQuery.isPending ? (
            <div className="sheet__body">
              <SheetSkeleton rows={3} height={64} />
            </div>
          ) : accountsQuery.isError ? (
            <Failure error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
          ) : accounts.length === 0 ? (
            <div className="sheet__body">
              <p className="note note--faint">
                Todavía no vinculas ninguna cuenta. Usa el formulario de al lado para empezar.
              </p>
            </div>
          ) : (
            <>
              <MutationNotice error={accountError} padded />
              {syncNotice ? (
                <div className="sheet__body">
                  <Notice tone="pen" role="status">
                    <Icon as={AlertCircle} size={15} />
                    {syncNotice}
                  </Notice>
                </div>
              ) : null}
              <div className="sheet__body sheet__body--flush">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onSync={syncGame}
                    onUnlink={unlinkGame}
                    unlinkButtonRef={unlinkButtonRef(account.id)}
                    syncing={syncAccount.isPending && syncAccount.variables === account.id}
                    unlinking={unlinkAccount.isPending && unlinkAccount.variables === account.id}
                    locked={accountsBusy}
                    offerSteamVerify
                    offerRiotVerify
                    owner={user}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="sheet">
          <div className="sheet__head">
            <h2 className="sheet-title">Vincular un juego</h2>
          </div>
          <div className="sheet__body">
            <LinkAccountForm
              linkedGames={accounts.map((account) => account.gameId)}
              aboveLol={<RiotVerifyButton />}
              aboveCs2={<SteamVerifyButton />}
            />
          </div>
        </section>
      </div>

      <section className="sheet sheet--punched">
        <div className="sheet__head">
          <div className="grow">
            <h2 className="sheet-title">Mis horas de la semana</h2>
            <p className="note note--faint line" style={{ gap: 'var(--s3)' }}>
              {pluralize(blocks.length, 'bloque marcado', 'bloques marcados')}
              {pending ? <span className="prefs__pending">sin guardar</span> : null}
            </p>
          </div>
          <div className="line">
            {pending ? (
              <AppButton type="button" size="sm" onClick={() => setDraftBlocks(null)}>
                Descartar
              </AppButton>
            ) : null}
            <AppButton
              type="button"
              tone="pen" size="sm"
              onClick={handleSaveAvailability}
              disabled={!pending || saveAvailability.isPending}
            >
              {saveAvailability.isPending ? <Spinner /> : <Icon as={Save} size={13} />}
              {saveAvailability.isPending ? SENDING_TEXT : 'Guardar horas'}
            </AppButton>
          </div>
        </div>

        <MutationNotice error={saveAvailability.error} padded />

        {availabilityQuery.isPending ? (
          <div className="sheet__body">
            <SheetSkeleton rows={6} height={34} />
          </div>
        ) : availabilityQuery.isError ? (
          <Failure error={availabilityQuery.error} onRetry={() => availabilityQuery.refetch()} />
        ) : (
          <div className="sheet__body">
            <HoursSheet value={blocks} onChange={setDraftBlocks} />
          </div>
        )}

        {blocks.length > 0 ? (
          <div className="sheet__foot">
            <span className="prefs__ranges">
              {groupBlocks(blocks).map((range) => (
                <span key={`${range.day}-${range.startHour}`}>{formatRange(range)}</span>
              ))}
            </span>
          </div>
        ) : null}
      </section>

      <UnlinkAccountDialog
        open={unlinkOpen}
        title={unlinkTarget?.title ?? ''}
        onClose={closeUnlinkDialog}
        onConfirm={confirmUnlink}
        pending={unlinkAccount.isPending}
        error={unlinkAccount.error}
        titleRef={dialogTitleRef}
        confirmRef={dialogConfirmRef}
      />
    </>
  );
}
