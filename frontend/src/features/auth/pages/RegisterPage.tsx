import { AlertCircle, ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { Icon } from '@/shared/components/Icon';
import { TextField } from '@/shared/components/TextField';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
  isValid,
  required,
  validEmail,
  validPassword,
  validUsername,
  type FieldErrors,
} from '@/shared/utils/validation';
import { useAuth } from '../useAuth';
import './authForm.css';

interface RegisterForm {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: RegisterForm = {
  displayName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  useDocumentTitle('Crear cuenta');

  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<RegisterForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof RegisterForm) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors<RegisterForm> = {
      displayName: required(form.displayName, 'Escribe tu nombre.'),
      username: validUsername(form.username),
      email: validEmail(form.email),
      password: validPassword(form.password),
      confirmPassword:
        form.confirmPassword === form.password ? undefined : 'Las contraseñas no coinciden.',
    };
    setErrors(nextErrors);
    if (!isValid(nextErrors)) return;

    setSubmitting(true);
    try {
      await register({
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      // Una cuenta nueva no tiene juegos ni horas: se parte por llenar la ficha.
      navigate(ROUTES.settings, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="access" onSubmit={handleSubmit} noValidate>
      <header className="access__head">
        <h2 className="doc-title">Crear cuenta</h2>
        <p className="note">Después vinculas tus juegos y marcas tus horas.</p>
      </header>

      {submitError ? (
        <p className="notice notice--error" role="alert">
          <Icon as={AlertCircle} size={15} />
          {submitError}
        </p>
      ) : null}

      <div className="access__fields">
        <TextField
          label="Nombre"
          autoComplete="name"
          placeholder="Cómo quieres que te vean"
          value={form.displayName}
          onChange={update('displayName')}
          error={errors.displayName}
        />
        <TextField
          label="Usuario"
          autoComplete="username"
          placeholder="tu_nick"
          value={form.username}
          onChange={update('username')}
          error={errors.username}
          hint="Es con lo que el resto te identifica en la hoja."
        />
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <TextField
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
        />
      </div>

      <button type="submit" className="btn btn--pen btn--block" disabled={submitting}>
        {submitting ? <span className="btn__spin" /> : <Icon as={ArrowRight} size={15} />}
        {submitting ? 'Creando…' : 'Crear cuenta'}
      </button>

      <p className="access__foot">
        ¿Ya tienes cuenta? <Link to={ROUTES.login}>Entrar</Link>
      </p>
    </form>
  );
}
