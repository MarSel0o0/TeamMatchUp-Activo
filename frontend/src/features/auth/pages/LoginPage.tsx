import { AlertCircle, ArrowRight, Info } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { env } from '@/config/env';
import { isSessionCleared } from '@/services/api';
import { DEMO_CREDENTIALS } from '@/services/mock/seed';
import { Icon } from '@/shared/components/Icon';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { LOGIN_NOTICES, NO_MESSAGE_TEXT, SENDING_TEXT, type LoginNotice } from '@/shared/utils/copy';
import { isValid, validEmail, type FieldErrors } from '@/shared/utils/validation';
import { useAuth } from '../useAuth';
import './authForm.css';

interface LoginForm {
  email: string;
  password: string;
}

/** Lo que otra parte de la aplicación deja en la navegación hacia login (plan 3.6). */
interface LoginNavigationState {
  from?: string;
  email?: string;
  notice?: LoginNotice;
}

/** Lee el estado de navegación sin confiar en su forma: lo no reconocido se ignora. */
function readNavigationState(raw: unknown): LoginNavigationState {
  if (typeof raw !== 'object' || raw === null) return {};
  const { from, email, notice } = raw as Record<string, unknown>;
  return {
    from: typeof from === 'string' && from.startsWith('/') ? from : undefined,
    email: typeof email === 'string' ? email : undefined,
    notice:
      typeof notice === 'string' && Object.prototype.hasOwnProperty.call(LOGIN_NOTICES, notice)
        ? (notice as LoginNotice)
        : undefined,
  };
}

export default function LoginPage() {
  useDocumentTitle('Entrar');

  const { login } = useAuth();
  const location = useLocation();
  const { from, email, notice } = readNavigationState(location.state);

  const [form, setForm] = useState<LoginForm>({ email: email ?? '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Un solo envío por doble clic, aunque el estado de la escritura aún no se haya pintado (RF-20).
  const sending = useRef(false);

  const update = (field: keyof LoginForm) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setSubmitError(null);

    const nextErrors: FieldErrors<LoginForm> = {
      email: validEmail(form.email),
      password: form.password ? undefined : 'Escribe tu contraseña.',
    };
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    sending.current = true;
    setSubmitting(true);
    try {
      // `from` guarda la vista a la que el usuario intentaba entrar antes del login; el
      // proveedor navega en el mismo lote que fija al usuario (RF-8).
      await login({ email: form.email.trim(), password: form.password }, from ?? ROUTES.home);
    } catch (error) {
      // El mensaje del servidor se muestra tal como llega; sin mensaje, el texto fijo (RF-9).
      if (!isSessionCleared(error)) {
        setSubmitError(error instanceof Error && error.message ? error.message : NO_MESSAGE_TEXT);
      }
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form className="access" onSubmit={handleSubmit} noValidate>
      <header className="access__head">
        <h2 className="doc-title">Entrar</h2>
        <p className="note">Tus coincidencias y tu agenda te están esperando.</p>
      </header>

      {submitError ? (
        <p className="notice notice--error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {submitError}
        </p>
      ) : notice ? (
        <p className="notice notice--pen" role="alert">
          <Icon as={Info} size={15} />
          {LOGIN_NOTICES[notice]}
        </p>
      ) : null}

      <div className="access__fields">
        <TextField
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
      </div>

      <button type="submit" className="btn btn--pen btn--block access__submit" disabled={submitting}>
        {submitting ? <span className="btn__spin" /> : <Icon as={ArrowRight} size={15} />}
        {submitting ? SENDING_TEXT : 'Entrar'}
      </button>

      {env.useMockApi ? (
        <div className="access__demo">
          <span>
            Esta copia corre con datos de demostración. Entra con{' '}
            <code>{DEMO_CREDENTIALS.email}</code> y contraseña{' '}
            <code>{DEMO_CREDENTIALS.password}</code>.
          </span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              setForm({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
              setErrors({});
            }}
          >
            Rellenar esos datos
          </button>
        </div>
      ) : null}

      <p className="access__foot">
        ¿Todavía no tienes cuenta? <Link to={ROUTES.register}>Crear una</Link>
      </p>
    </form>
  );
}
