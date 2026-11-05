import { Link, useNavigate } from 'react-router';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formError, submitting } = useForm(
    { login: '', password: '' },
    async (values) => {
      await login(values);
      navigate('/', { replace: true });
    },
  );

  return (
    <AuthLayout title="Entrar" subtitle="Bem-vindo de volta.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          label="E-mail ou usuário"
          autoComplete="username"
          autoFocus
          required
          {...register('login')}
        />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          {...register('password')}
        />

        {formError && (
          <p role="alert" className="font-mono text-xs text-alarm">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2 w-full justify-center">
          {submitting ? <Spinner label="Entrando" /> : 'Entrar'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link to="/register" className="text-fg underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  );
}
