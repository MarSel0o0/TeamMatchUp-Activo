import { useState, type FormEvent } from 'react';
import { formatRange, groupBlocks } from '@/domain/availability';
import type { TimeBlock } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { AvailabilityGrid } from '@/shared/components/AvailabilityGrid';
import { TextField } from '@/shared/components/TextField';
import { ErrorState, SkeletonList } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { pluralize } from '@/shared/utils/format';
import { AccountCard } from '../components/AccountCard';
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
  useDocumentTitle('Configuración del perfil');

  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const availabilityQuery = useAvailability();
  const saveAvailability = useSaveAvailability();
  const unlinkAccount = useUnlinkAccount();
  const syncAccount = useSyncAccount();

  const accounts = accountsQuery.data ?? [];

  /* --- Datos de la cuenta ------------------------------------------------ */

  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate({ displayName: displayName.trim(), bio: bio.trim() });
  };

  /* --- Disponibilidad ---------------------------------------------------- */

  // La grilla se edita en local y se confirma con "Guardar": así el usuario
  // puede pintar varios bloques sin una petición por celda.
  const [draftBlocks, setDraftBlocks] = useState<TimeBlock[] | null>(null);
  const blocks = draftBlocks ?? availabilityQuery.data ?? [];
  const hasChanges =
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
      `¿Desvincular tu cuenta${account ? ` de ${account.handle}` : ''}? Dejarás de aparecer en las coincidencias de ese juego.`,
    );
    if (confirmed) await unlinkAccount.mutateAsync(accountId);
  };

  if (!user) return null;

  return (
    <>
      <header>
        <h1 className="page-title">Configuración del perfil</h1>
        <p className="page-subtitle">
          Vincula las cuentas de los juegos que juegas y declara cuándo puedes jugar.
        </p>
      </header>

      <section className="card">
        <div className="card__header">
          <h2 className="section-title">Datos de la cuenta</h2>
          {updateProfile.isSuccess ? <span className="badge badge--success">Guardado</span> : null}
        </div>

        <form className="settings-profile" onSubmit={handleProfileSubmit}>
          <TextField
            label="Nombre visible"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <div className="field">
            <label className="field__label" htmlFor="settings-bio">
              Descripción
            </label>
            <textarea
              id="settings-bio"
              className="textarea"
              maxLength={200}
              placeholder="Cuenta en qué rol juegas, qué buscas en un equipo…"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <span className="field__hint">{bio.length}/200 caracteres</span>
          </div>

          <div className="row">
            <button type="submit" className="btn btn--primary" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <span className="faint">
              Correo: {user.email} · Zona horaria: {user.timezone}
            </span>
          </div>
        </form>
      </section>

      <section className="settings-accounts">
        <div className="card">
          <div className="card__header">
            <div>
              <h2 className="section-title">Cuentas vinculadas</h2>
              <p className="page-subtitle">
                Actualizamos tu rango de forma periódica desde la fuente de cada juego.
              </p>
            </div>
          </div>

          {accountsQuery.isPending ? (
            <SkeletonList rows={2} height={140} />
          ) : accountsQuery.isError ? (
            <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
          ) : accounts.length === 0 ? (
            <p className="muted">
              Todavía no vinculas ninguna cuenta. Usa el formulario de al lado para empezar.
            </p>
          ) : (
            <div className="stack">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onSync={(accountId) => syncAccount.mutate(accountId)}
                  onUnlink={unlinkGame}
                  syncing={syncAccount.isPending && syncAccount.variables === account.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="section-title">Vincular un juego</h2>
          </div>
          <LinkAccountForm linkedGames={accounts.map((account) => account.gameId)} />
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="section-title">Disponibilidad semanal</h2>
            <p className="page-subtitle">
              Marca los bloques en que sueles poder jugar. Es lo que cruzamos con el resto de
              jugadores.
            </p>
          </div>
          <div className="row">
            <span className="badge">
              {pluralize(blocks.length, 'bloque marcado', 'bloques marcados')}
            </span>
            {hasChanges ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDraftBlocks(null)}
              >
                Descartar
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSaveAvailability}
              disabled={!hasChanges || saveAvailability.isPending}
            >
              {saveAvailability.isPending ? 'Guardando…' : 'Guardar horarios'}
            </button>
          </div>
        </div>

        {availabilityQuery.isPending ? (
          <SkeletonList rows={1} height={320} />
        ) : availabilityQuery.isError ? (
          <ErrorState error={availabilityQuery.error} onRetry={() => availabilityQuery.refetch()} />
        ) : (
          <div className="stack">
            <AvailabilityGrid value={blocks} onChange={setDraftBlocks} />
            {blocks.length > 0 ? (
              <div className="settings-ranges">
                {groupBlocks(blocks).map((range) => (
                  <span key={`${range.day}-${range.startHour}`} className="badge badge--primary">
                    {formatRange(range)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
