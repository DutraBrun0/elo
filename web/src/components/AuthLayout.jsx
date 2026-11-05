import { Logo } from './ui/Logo.jsx';

const events = [
  { name: 'message:send', detail: '"oi! tudo certo?"', color: 'text-muted' },
  { name: 'receipt:update', detail: 'delivered', color: 'text-sky' },
  { name: 'typing:update', detail: 'digitando...', color: 'text-iris-glow' },
  { name: 'receipt:update', detail: 'read', color: 'text-iris-glow' },
];

/**
 * Moldura das telas de login/cadastro: título editorial à esquerda e um "terminal"
 * com os eventos do socket, mostrando o que o app faz por baixo dos panos.
 */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[1200px] items-center gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <section className="hidden lg:block">
        <Logo />
        <h1 className="mt-10 font-display text-[64px] leading-none tracking-[-0.01em] text-fg xl:text-[77px]">
          Conversas em tempo real, sem ruído.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Mensagens instantâneas com status de entrega e leitura, presença e indicador de digitação.
        </p>

        <div className="mt-12 max-w-md rounded-2xl border border-line p-5 font-mono text-[13px]">
          <div className="mb-4 flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-2 w-2 rounded-full border border-line" />
            ))}
          </div>
          <ul className="space-y-2">
            {events.map((event, index) => (
              <li
                key={index}
                className="flex animate-fade-up gap-3"
                style={{ animationDelay: `${150 + index * 120}ms` }}
              >
                <span className="text-iris">{event.name}</span>
                <span className={event.color}>{event.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-sm">
        <Logo className="mb-10 lg:hidden" />
        <h2 className="text-2xl font-medium text-fg">{title}</h2>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
