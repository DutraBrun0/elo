import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '../ui/Avatar.jsx';
import { formatPresence } from '../../lib/format.js';

export function ChatHeader({ contact, presence, isTyping }) {
  const status = isTyping ? 'digitando...' : formatPresence(presence);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-2 sm:px-4">
      <Link
        to="/"
        aria-label="Voltar para conversas"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-fg md:hidden"
      >
        <ArrowLeft size={20} strokeWidth={1.5} />
      </Link>
      <Avatar user={contact} size="sm" online={presence?.online} />
      <div className="min-w-0">
        <h2 className="truncate font-medium text-fg">{contact?.name}</h2>
        <p
          aria-live="polite"
          className={`truncate font-mono text-[11px] ${isTyping ? 'text-iris-glow' : 'text-muted'}`}
        >
          {status || `@${contact?.username}`}
        </p>
      </div>
    </header>
  );
}
