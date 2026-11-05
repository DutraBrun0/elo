import { Link, useNavigate } from 'react-router';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';

// Erros de conflito (409) chegam sem `details`; mapeamos o código para o campo certo.
const conflictField = { EMAIL_TAKEN: 'email', USERNAME_TAKEN: 'username' };

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ name: '', username: '', email: '', password: '' }, async (values) => {
    try {
      await signUp(values);
      navigate('/', { replace: true });
    } catch (error) {
      const field = conflictField[error.code];
      if (field) error.details = { [field]: [error.message] };
      throw error;
    }
  });
  const { register, handleSubmit, formError, submitting } = form;

  return (
    <AuthLayout title="Criar conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Nome" autoComplete="name" autoFocus required {...register('name')} />
        <Field
          label="Usuário"
          autoComplete="username"
          hint="3 a 30 caracteres: letras, números, _ ou ."
          required
          {...register('username')}
        />
        <Field label="E-mail" type="email" autoComplete="email" required {...register('email')} />
        <Field
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres"
          required
          {...register('password')}
        />

        {formError && (
          <p role="alert" className="font-mono text-xs text-alarm">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-2 w-full justify-center">
          {submitting ? <Spinner label="Criando conta" /> : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        Já tem conta?{' '}
        <Link to="/login" className="text-fg underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
