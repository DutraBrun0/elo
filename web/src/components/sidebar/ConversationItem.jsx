import { NavLink } from 'react-router';
import { Avatar } from '../ui/Avatar.jsx';
import { MessageStatus } from '../chat/MessageStatus.jsx';
import { formatListDate } from '../../lib/format.js';

export function ConversationItem({ conversation, me, presence, isTyping }) {
  const contact = conversation.participants[0];
  const { lastMessage, unreadCount } = conversation;
  const mine = lastMessage?.senderId === me;

  return (
    <li>
      <NavLink
        to={`/c/${conversation.id}`}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md border px-3 py-3 transition-colors duration-150 ${
            isActive ? 'border-line bg-lift' : 'border-transparent hover:border-line'
          }`
        }
      >
        <Avatar user={contact} online={presence?.online} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium text-fg">
              {conversation.title ?? contact?.name}
            </span>
            {lastMessage && (
              <time
                dateTime={lastMessage.createdAt}
                className={`shrink-0 font-mono text-[11px] ${unreadCount ? 'text-iris-glow' : 'text-subtle'}`}
              >
                {formatListDate(lastMessage.createdAt)}
              </time>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm">
            {isTyping ? (
              <span className="truncate text-iris-glow">digitando...</span>
            ) : (
              <>
                {mine && <MessageStatus status={lastMessage.status} />}
                <span className="truncate text-muted">
                  {lastMessage?.content ?? (
                    <span className="font-mono text-xs text-subtle">@{contact?.username}</span>
                  )}
                </span>
              </>
            )}
            {unreadCount > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-iris/50 px-1.5 font-mono text-[11px] text-iris-glow">
                {unreadCount > 99 ? '99+' : unreadCount}
                <span className="sr-only"> não lidas</span>
              </span>
            )}
          </span>
        </span>
      </NavLink>
    </li>
  );
}
