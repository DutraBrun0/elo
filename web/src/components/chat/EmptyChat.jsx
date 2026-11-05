import { LogoMark } from '../ui/Logo.jsx';

/** Painel vazio do desktop, quando nenhuma conversa está aberta. */
export function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <LogoMark size={56} />
      <div>
        <p className="font-display text-3xl text-fg">Suas conversas aparecem aqui.</p>
        <p className="mt-3 text-sm text-muted">
          Escolha uma conversa ao lado ou busque alguém para começar.
        </p>
      </div>
      <p className="font-mono text-[11px] text-subtle">enter envia · shift+enter quebra a linha</p>
    </div>
  );
}
