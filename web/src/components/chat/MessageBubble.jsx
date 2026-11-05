import { RotateCw } from 'lucide-react';
import { MessageStatus } from './MessageStatus.jsx';
import { formatTime } from '../../lib/format.js';

/**
 * Balão de mensagem. As próprias ficam à direita com borda violeta translúcida sobre a
 * superfície elevada; as recebidas, com a borda grafite padrão sobre o preto.
 */
export function MessageBubble({ message, mine, grouped, onRetry }) {
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-3.5 pt-2 pb-1.5 sm:max-w-[70%] ${
          mine ? 'border-iris/35 bg-lift' : 'border-line bg-canvas'
        } ${message.status === 'failed' ? 'border-alarm/50' : ''}`}
      >
        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-body">
          {message.content}
        </p>
        <p className="mt-0.5 flex items-center justify-end gap-1.5 font-mono text-[10px] text-subtle">
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
          {mine && <MessageStatus status={message.status} />}
        </p>
        {message.status === 'failed' && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="mt-1 mb-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-alarm hover:text-fg"
          >
            <RotateCw size={12} /> não enviada — tentar de novo
          </button>
        )}
      </div>
    </li>
  );
}
