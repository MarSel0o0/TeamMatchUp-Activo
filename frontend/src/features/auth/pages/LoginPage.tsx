import { AlertCircle, ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { env } from '@/config/env';
import { DEMO_CREDENTIALS } from '@/services/mock/seed';
import { Icon } from '@/shared/components/Icon';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { isValid, validEmail, type FieldErrors } from '@/shared/utils/validation';
import { useAuth } from '../useAuth';
import './authForm.css';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  useDocumentTitle('Entrar');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof LoginForm) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors<LoginForm> = {
      email: validEmail(form.email),
      password: form.password ? undefined : 'Escribe tu contraseña.',
    };
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      // `from` guarda la vista a la que el usuario intentaba entrar antes del login.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? ROUTES.home, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo entrar.');
    } finally {
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

      <button type="submit" className="btn btn--pen btn--block" disabled={submitting}>
        {submitting ? <span className="btn__spin" /> : <Icon as={ArrowRight} size={15} />}
        {submitting ? 'Entrando…' : 'Entrar'}
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
