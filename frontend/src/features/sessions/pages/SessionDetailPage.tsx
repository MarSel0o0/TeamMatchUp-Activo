import { CalendarRange } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/useAuth';
import { Blank, Failure, Working } from '@/shared/components/States';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
  GO_TO_SCHEDULE_LABEL,
  LOADING_TEXT,
  SESSION_DETAIL_TITLE,
  SESSION_GONE_TEXT,
  SESSION_GONE_TITLE,
} from '@/shared/utils/copy';
import { CancelSessionDialog } from '../components/CancelSessionDialog';
import { SessionActionsZone } from '../components/SessionActionsZone';
import { SessionEditForm } from '../components/SessionEditForm';
import { SessionDetailFacts } from '../components/SessionDetailFacts';
import { useDetailController } from '../detail/useDetailController';
import './sessionDetail.css';

/**
 * Detalle de una sesión, `/agenda/:sessionId` (spec 009). Cada entrada del historial es una
 * apertura nueva (R1): la página se monta con la clave de la ubicación.
 *
 * `AppLayout` anima la salida de la página y deja montado este elemento mientras sale; entonces
 * `useLocation()` ya es la ubicación de destino y su clave cambiaría, remontando la página (otra
 * lectura de la sesión y otro foco, RF-17). Por eso la clave solo sigue a la ubicación mientras
 * la ruta es la de esta apertura (D-2).
 */
export default function SessionDetailRoute() {
  const location = useLocation();
  const [opening] = useState(() => ({ pathname: location.pathname, key: location.key }));
  const [key, setKey] = useState(opening.key);
  if (location.pathname === opening.pathname && location.key !== key) setKey(location.key);
  return <SessionDetailPage key={key} />;
}

function SessionDetailPage() {
  const { sessionId: rawId = '' } = useParams();
  const { user } = useAuth();
  // `ProtectedRoute` garantiza la sesión; si se limpia (007 RF-7, RF-24) no se monta nada.
  if (!user) return null;
  return <SessionDetailBody rawId={rawId} currentUserId={user.id} />;
}

function SessionDetailBody({ rawId, currentUserId }: { rawId: string; currentUserId: string }) {
  const {
    error,
    screen,
    session,
    retry,
    retryBusy,
    focusRef,
    join,
    leave,
    openForm,
    discard,
    openDialog,
    closeDialog,
    confirmCancel,
    dialogOpen,
    dialogMessage,
    changeForm,
    submitForm,
    form,
    formMessage,
    savedNotice,
    blocked,
    inFlight,
    rereading,
    zoneMessage,
  } = useDetailController(rawId);

  useDocumentTitle(session?.title ?? SESSION_DETAIL_TITLE);

  if (screen === 'none') return null;

  if (screen === 'empty') {
    return (
      <Blank
        icon={CalendarRange}
        title={SESSION_GONE_TITLE}
        description={SESSION_GONE_TEXT}
        headingRef={focusRef('emptyTitle')}
        action={
          <Link className="btn" to={ROUTES.schedule}>
            {GO_TO_SCHEDULE_LABEL}
          </Link>
        }
      />
    );
  }

  if (screen === 'pageError') {
    return (
      <Failure
        error={error}
        onRetry={retry}
        retryBusy={retryBusy}
        headingRef={focusRef('errorMessage')}
      />
    );
  }

  if (screen === 'loading' || session === null) return <Working label={LOADING_TEXT} />;

  return (
    <>
      <SessionDetailFacts
        session={session}
        currentUserId={currentUserId}
        titleRef={focusRef('sessionTitle')}
      />
      <SessionActionsZone
        session={session}
        currentUserId={currentUserId}
        pending={
          inFlight?.action === 'join' || inFlight?.action === 'leave' || inFlight?.action === 'save'
            ? inFlight.action
            : null
        }
        rereading={rereading}
        message={zoneMessage}
        savedNotice={savedNotice}
        formOpen={form !== null}
        blocked={blocked}
        onJoin={join}
        onLeave={leave}
        onEdit={openForm}
        onCancel={openDialog}
        joinRef={focusRef('joinButton')}
        leaveRef={focusRef('leaveButton')}
        editRef={focusRef('editButton')}
        cancelRef={focusRef('cancelButton')}
        messageRef={focusRef('zoneMessage')}
      />
      {form !== null ? (
        <SessionEditForm
          session={session}
          values={form.values}
          onChange={changeForm}
          message={formMessage}
          saving={inFlight?.action === 'save'}
          rereading={rereading}
          onSubmit={submitForm}
          onDiscard={discard}
          titleRef={focusRef('titleField')}
          saveRef={focusRef('saveButton')}
        />
      ) : null}
      <CancelSessionDialog
        open={dialogOpen}
        onClose={closeDialog}
        onConfirm={confirmCancel}
        pending={inFlight?.action === 'cancel'}
        message={dialogMessage}
        titleRef={focusRef('dialogTitle')}
        confirmRef={focusRef('dialogConfirm')}
      />
    </>
  );
}
