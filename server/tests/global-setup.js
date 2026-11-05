import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/** Recria o banco de teste (arquivo SQLite descartável) antes da suíte e aplica as migrations. */
export default function globalSetup() {
  rmSync(new URL('../prisma/test.db', import.meta.url), { force: true });
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
