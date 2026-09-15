import { Check, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import type { TimeBlock } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { HoursSheet } from '@/shared/components/HoursSheet';
import { Icon } from '@/shared/components/Icon';
import { Stamp } from '@/shared/components/Stamp';
import { Failure, SheetSkeleton } from '@/shared/components/States';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize } from '@/shared/utils/format';
import { AccountRow } from '../components/AccountRow';
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

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate({ displayName: displayName.trim(), bio: bio.trim() });
  };

  /* --- Horas -------------------------------------------------------------- */

  // La hoja se raya en local y se confirma con «Guardar»: así el usuario puede
  // marcar veinte bloques sin veinte peticiones.
  const [draftBlocks, setDraftBlocks] = useState<TimeBlock[] | null>(null);
  const blocks = draftBlocks ?? availabilityQuery.data ?? [];
  const pending =
    draftBlocks !== null &&
    JSON.stringify([...draftBlocks].sort()) !==
      JSON.stringify([...(availabilityQuery.data ?? [])].sort());

  const handleSaveAvailability = async () => {
    if (!draftBlocks) return;
    await saveAvailability.mutateAsync(draftBlocks);
    setDraftBlocks(null);
  };

  const unlinkGame = async (accountId: string) => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    const confirmed = window.confirm(
      `¿Desvincular ${account ? account.handle : 'esta cuenta'}? Dejarás de aparecer en las coincidencias de ese juego.`,
    );
    if (confirmed) await unlinkAccount.mutateAsync(accountId);
  };

  if (!user) return null;

  return (
    <>
      <header className="stack-sm">
        <h1 className="doc-title">Configuración</h1>
        <p className="lead">
          Vincula los juegos que juegas y declara cuándo puedes jugar. Es lo que cruzamos con el
          resto.
        </p>
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

          <div className="field">
            <label className="label" htmlFor="prefs-bio">
              Cómo juegas
            </label>
            <textarea
              id="prefs-bio"
              className="textarea"
              maxLength={200}
              placeholder="Rol que prefieres, qué buscas en un equipo, cómo te comunicas…"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <span className="field__hint">{bio.length}/200 caracteres</span>
          </div>

          <div className="line">
            <button type="submit" className="btn btn--pen" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? <span className="btn__spin" /> : <Icon as={Save} size={14} />}
              {updateProfile.isPending ? 'Guardando…' : 'Guardar ficha'}
            </button>
            <span className="note note--faint">
              {user.email} · {user.timezone}
            </span>
          </div>
        </form>
      </section>

      <div className="prefs__columns">
        <section className="sheet">
          <div className="sheet__head">
            <h2 className="sheet-title grow">Cuentas vinculadas</h2>
            <span className="note note--faint">Releemos el rango de forma periódica</span>
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
            <div className="sheet__body sheet__body--flush">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onSync={(accountId) => syncAccount.mutate(accountId)}
                  onUnlink={unlinkGame}
                  syncing={syncAccount.isPending && syncAccount.variables === account.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="sheet">
          <div className="sheet__head">
            <h2 className="sheet-title">Vincular un juego</h2>
          </div>
          <div className="sheet__body">
            <LinkAccountForm linkedGames={accounts.map((account) => account.gameId)} />
          </div>
        </section>
      </div>

      <section className="sheet sheet--punched">
        <div className="sheet__head">
          <div className="grow">
            <h2 className="sheet-title">Mis horas de la semana</h2>
            <p className="note note--faint">
              {pluralize(blocks.length, 'bloque marcado', 'bloques marcados')}
              {pending ? ' · sin guardar' : ''}
            </p>
          </div>
          <div className="line">
            {pending ? (
              <button type="button" className="btn btn--sm" onClick={() => setDraftBlocks(null)}>
                Descartar
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--pen btn--sm"
              onClick={handleSaveAvailability}
              disabled={!pending || saveAvailability.isPending}
            >
              {saveAvailability.isPending ? <span className="btn__spin" /> : <Icon as={Save} size={13} />}
              {saveAvailability.isPending ? 'Guardando…' : 'Guardar horas'}
            </button>
          </div>
        </div>

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
            <span className="num prefs__ranges">
              {groupBlocks(blocks)
                .map((range) => formatRange(range))
                .join('   ·   ')}
            </span>
          </div>
        ) : null}
      </section>
    </>
  );
}
