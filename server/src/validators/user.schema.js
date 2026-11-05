import { z } from 'zod';

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1, 'Informe o termo de busca').max(60),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
