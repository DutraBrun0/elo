import { useState } from 'react';
import { LogOut, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useChat } from '../../contexts/ChatContext.jsx';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { Logo } from '../ui/Logo.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { ConversationItem } from './ConversationItem.jsx';
import { UserSearchResults } from './UserSearch.jsx';

export function Sidebar({ className = '' }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { conversations, conversationsStatus, presence, typing, loadConversations } = useChat();
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  return (
    <aside className={`flex min-h-0 flex-col border-line md:border-r ${className}`}>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Logo />
        <div className="flex items-center gap-1">
          <span className="hidden text-right sm:block">
            <span className="block text-sm text-fg">{user.name}</span>
            <span className="block font-mono text-[11px] text-iris">@{user.username}</span>
          </span>
          <Avatar user={user} size="sm" />
          <Button variant="quiet" size="icon" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      {!connected && (
        <p
          role="status"
          className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-line px-3 py-2 font-mono text-xs text-muted"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-alarm" /> reconectando...
        </p>
      )}

      <div className="px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">Buscar usuários</span>
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Buscar pessoas para conversar"
            className="h-10 w-full rounded-md border border-line bg-canvas pr-9 pl-9 text-sm text-body placeholder:text-faint transition-colors duration-150 hover:border-subtle focus:border-iris focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-subtle hover:text-fg"
            >
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="Conversas">
        {searching ? (
          <UserSearchResults query={query} onDone={() => setQuery('')} />
        ) : conversationsStatus === 'loading' || conversationsStatus === 'idle' ? (
          <Spinner className="py-10" />
        ) : conversationsStatus === 'error' ? (
          <div className="px-3 py-10 text-center text-sm text-muted">
            <p>Não foi possível carregar as conversas.</p>
            <Button className="mt-4" onClick={loadConversations}>
              Tentar de novo
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-fg">Nenhuma conversa ainda</p>
            <p className="mt-2 text-sm text-muted">
              Use a busca acima para encontrar alguém pelo nome ou @usuário.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                me={user.id}
                presence={presence[conversation.participants[0]?.id]}
                isTyping={Object.keys(typing[conversation.id] ?? {}).length > 0}
              />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
