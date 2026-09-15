import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { env } from '@/config/env';
import { DEMO_CREDENTIALS } from '@/services/mock/seed';
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
  useDocumentTitle('Iniciar sesión');

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
      password: form.password ? undefined : 'Ingresa tu contraseña.',
    };
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      // `from` guarda la vista a la que el usuario intentaba entrar antes del login.
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? ROUTES.profile, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const useDemoAccount = () => {
    setForm({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
    setErrors({});
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <header className="auth-form__header">
        <h1 className="page-title">Iniciar sesión</h1>
        <p className="page-subtitle">Entra para ver tus coincidencias y tu agenda.</p>
      </header>

      {submitError ? <p className="alert">{submitError}</p> : null}

      <div className="auth-form__fields">
        <TextField
          label="Correo electrónico"
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

      <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
        {submitting ? <span className="spinner" /> : null}
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>

      {env.useMockApi ? (
        <div className="auth-form__demo">
          <span>
            Modo demostración: usa <code>{DEMO_CREDENTIALS.email}</code> con la contraseña{' '}
            <code>{DEMO_CREDENTIALS.password}</code>.
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={useDemoAccount}>
            Rellenar cuenta de demostración
          </button>
        </div>
      ) : null}

      <p className="auth-form__footer">
        ¿Todavía no tienes cuenta? <Link to={ROUTES.register}>Regístrate</Link>
      </p>
    </form>
  );
}
