import { z } from 'zod';

const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  // O bcrypt ignora tudo depois de 72 bytes; limitar evita senhas "truncadas" silenciosamente.
  .max(72, 'A senha deve ter no máximo 72 caracteres');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,30}$/, 'Use de 3 a 30 caracteres: letras, números, "_" ou "."'),
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido').max(254)),
  password,
});

export const loginSchema = z.object({
  /** Aceita e-mail ou nome de usuário. */
  login: z.string().trim().toLowerCase().min(1, 'Informe e-mail ou usuário'),
  password: z.string().min(1, 'Informe a senha'),
});
