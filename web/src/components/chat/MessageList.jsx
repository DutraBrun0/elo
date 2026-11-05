import { useEffect, useLayoutEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { formatDayDivider, isSameDay } from '../../lib/format.js';

const NEAR_BOTTOM_PX = 120;
const GROUP_WINDOW_MS = 2 * 60 * 1000;

/**
 * Histórico com scroll infinito para cima:
 * - um sentinela no topo, observado por IntersectionObserver, pede a página anterior;
 * - ao inserir mensagens antigas, a posição de leitura é preservada (compensando a
 *   diferença de altura), para a tela não "pular";
 * - mensagens novas só rolam até o fim se o usuário já estava lá ou se foi ele quem enviou.
 */
export function MessageList({ thread, me, onLoadOlder, onRetry, typingName }) {
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const snapshot = useRef({ scrollHeight: 0, firstId: null, lastId: null, wasNearBottom: true });
  const { items, nextCursor, loadingOlder } = thread;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prev = snapshot.current;
    const firstId = items[0]?.id ?? null;
    const last = items.at(-1);

    if (prev.firstId === null) {
      el.scrollTop = el.scrollHeight; // primeira carga: começa no fim
    } else if (firstId !== prev.firstId && last?.id === prev.lastId) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight; // página antiga entrou no topo
    } else if (last?.id !== prev.lastId && (prev.wasNearBottom || last?.senderId === me)) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }

    snapshot.current = {
      ...snapshot.current,
      scrollHeight: el.scrollHeight,
      firstId,
      lastId: last?.id ?? null,
    };
  }, [items, me]);

  // Mantém o "estou perto do fim?" atualizado para decidir o auto-scroll.
  const onScroll = () => {
    const el = containerRef.current;
    snapshot.current.wasNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // Indicador de digitação aparecendo no fim: acompanha se o usuário já estava lá.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (typingName && el && snapshot.current.wasNearBottom) el.scrollTop = el.scrollHeight;
    if (el) snapshot.current.scrollHeight = el.scrollHeight;
  }, [typingName]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoadOlder(), {
      root: containerRef.current,
      rootMargin: '300px 0px 0px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, onLoadOlder]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
    >
      <div ref={sentinelRef} aria-hidden="true" />
      {loadingOlder && <Spinner className="py-3" label="Carregando mensagens antigas" />}
      {!nextCursor && items.length > 0 && (
        <p className="py-4 text-center font-mono text-[11px] text-subtle">início da conversa</p>
      )}

      <ol className="mx-auto flex max-w-3xl flex-col" aria-label="Mensagens">
        {items.map((message, index) => {
          const previous = items[index - 1];
          const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
          const grouped =
            !newDay &&
            previous.senderId === message.senderId &&
            new Date(message.createdAt) - new Date(previous.createdAt) < GROUP_WINDOW_MS;

          return [
            newDay && (
              <li key={`day-${message.id}`} className="my-4 flex justify-center">
                <span className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted">
                  {formatDayDivider(message.createdAt)}
                </span>
              </li>
            ),
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.senderId === me}
              grouped={grouped}
              onRetry={onRetry}
            />,
          ];
        })}
        {typingName && (
          <li className="mt-3 flex animate-fade-up">
            <span
              className="inline-flex items-center gap-1 rounded-2xl border border-line px-4 py-3"
              aria-label={`${typingName} está digitando`}
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-iris-glow"
                  style={{ animationDelay: `${dot * 150}ms` }}
                />
              ))}
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
