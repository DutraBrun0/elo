/**
 * Estado do chat em um reducer puro: toda mudança vinda da API ou do socket passa por
 * aqui, o que deixa o fluxo previsível e fácil de depurar.
 *
 * messages[conversationId].items fica em ordem cronológica (mais antiga → mais nova).
 * Mensagens otimistas usam o tempId como id e status "pending" até o ack do servidor.
 */

export const initialChatState = {
  conversations: [],
  conversationsStatus: 'idle',
  messages: {},
  typing: {},
  presence: {},
};

const STATUS_RANK = { failed: 0, pending: 0, sent: 1, delivered: 2, read: 3 };

const byDate = (a, b) =>
  new Date(a.createdAt) - new Date(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const emptyThread = { items: [], nextCursor: null, status: 'idle', loadingOlder: false };

function updateThread(state, conversationId, update) {
  const thread = state.messages[conversationId] ?? emptyThread;
  return {
    ...state,
    messages: { ...state.messages, [conversationId]: { ...thread, ...update(thread) } },
  };
}

/** Atualiza a conversa e a move para o topo quando há mensagem nova. */
function touchConversation(state, conversationId, update, { moveToTop = false } = {}) {
  const index = state.conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) return state;
  const updated = { ...state.conversations[index], ...update(state.conversations[index]) };
  const rest = state.conversations.filter((_, i) => i !== index);
  const conversations = moveToTop
    ? [updated, ...rest]
    : state.conversations.map((c, i) => (i === index ? updated : c));
  return { ...state, conversations };
}

/** Status que a mensagem própria atinge com a marca d'água do destinatário (só sobe, nunca desce). */
function upgradeStatus(message, { lastDeliveredAt, lastReadAt }) {
  if (STATUS_RANK[message.status] === 0) return message;
  const sentAt = new Date(message.createdAt).getTime();
  let next = message.status;
  if (lastReadAt && new Date(lastReadAt).getTime() >= sentAt) next = 'read';
  else if (lastDeliveredAt && new Date(lastDeliveredAt).getTime() >= sentAt) next = 'delivered';
  return STATUS_RANK[next] > STATUS_RANK[message.status] ? { ...message, status: next } : message;
}

/** Acrescenta a mensagem ao fim da conversa (se o histórico já foi carregado) e atualiza a lista. */
function appendMessage(state, message, { unread = false } = {}) {
  let next = state;
  if (state.messages[message.conversationId]?.status === 'ready') {
    next = updateThread(state, message.conversationId, (t) =>
      t.items.some((m) => m.id === message.id) ? {} : { items: [...t.items, message] },
    );
  }
  return touchConversation(
    next,
    message.conversationId,
    (c) => ({
      lastMessage: message,
      lastMessageAt: message.createdAt,
      unreadCount: unread ? c.unreadCount + 1 : c.unreadCount,
    }),
    { moveToTop: true },
  );
}

/**
 * @param {typeof initialChatState} state
 * @param {{ type: string } & Record<string, any>} action
 */
export function chatReducer(state, action) {
  switch (action.type) {
    case 'conversations/loading':
      return { ...state, conversationsStatus: state.conversations.length ? 'ready' : 'loading' };

    case 'conversations/loaded':
      return { ...state, conversations: action.conversations, conversationsStatus: 'ready' };

    case 'conversations/failed':
      return { ...state, conversationsStatus: 'error' };

    case 'conversations/upsert': {
      const exists = state.conversations.some((c) => c.id === action.conversation.id);
      return exists
        ? state
        : { ...state, conversations: [action.conversation, ...state.conversations] };
    }

    case 'conversation/read':
      return touchConversation(state, action.conversationId, () => ({ unreadCount: 0 }));

    case 'messages/loading':
      return updateThread(state, action.conversationId, (t) =>
        action.older
          ? { loadingOlder: true }
          : { status: t.status === 'ready' ? 'ready' : 'loading' },
      );

    case 'messages/loaded':
      return updateThread(state, action.conversationId, (t) => {
        const page = [...action.messages].reverse();
        if (action.older) {
          const known = new Set(t.items.map((m) => m.id));
          return {
            items: [...page.filter((m) => !known.has(m.id)), ...t.items],
            nextCursor: action.nextCursor,
            loadingOlder: false,
          };
        }
        // Carga inicial ou ressincronização após reconectar: a página mais recente vence,
        // mas mensagens ainda não confirmadas são preservadas.
        const pending = t.items.filter((m) => STATUS_RANK[m.status] === 0);
        return {
          items: [...page, ...pending].sort(byDate),
          nextCursor: action.nextCursor,
          status: 'ready',
        };
      });

    case 'messages/failed':
      return updateThread(state, action.conversationId, (t) => ({
        status: t.status === 'ready' ? 'ready' : 'error',
        loadingOlder: false,
      }));

    case 'message/pending':
      return appendMessage(state, action.message);

    case 'message/received':
      return appendMessage(state, action.message, { unread: action.unread });

    case 'message/confirmed': {
      const { tempId, message } = action;
      const swap = (m) => (m.id === tempId ? message : m);
      const next = updateThread(state, message.conversationId, (t) => ({
        items: t.items.some((m) => m.id === message.id)
          ? t.items.filter((m) => m.id !== tempId)
          : t.items.map(swap),
      }));
      return touchConversation(next, message.conversationId, (c) => ({
        lastMessage: c.lastMessage?.id === tempId ? message : c.lastMessage,
      }));
    }

    case 'message/failed': {
      const mark = (m) => (m.id === action.tempId ? { ...m, status: 'failed' } : m);
      const next = updateThread(state, action.conversationId, (t) => ({
        items: t.items.map(mark),
      }));
      return touchConversation(next, action.conversationId, (c) => ({
        lastMessage: c.lastMessage && mark(c.lastMessage),
      }));
    }

    case 'message/retry': {
      const mark = (m) => (m.id === action.tempId ? { ...m, status: 'pending' } : m);
      return updateThread(state, action.conversationId, (t) => ({ items: t.items.map(mark) }));
    }

    case 'receipt': {
      // MVP 1 a 1: a marca do único destinatário define o status. Em grupos, o servidor
      // continua sendo a fonte da verdade ao recarregar o histórico.
      const { conversationId, me } = action;
      const upgrade = (m) => (m.senderId === me ? upgradeStatus(m, action) : m);
      const next = updateThread(state, conversationId, (t) => ({ items: t.items.map(upgrade) }));
      return touchConversation(next, conversationId, (c) => ({
        lastMessage: c.lastMessage && upgrade(c.lastMessage),
      }));
    }

    case 'typing': {
      const { conversationId, userId, isTyping } = action;
      const current = { ...state.typing[conversationId] };
      if (isTyping) current[userId] = true;
      else delete current[userId];
      return { ...state, typing: { ...state.typing, [conversationId]: current } };
    }

    case 'presence': {
      const presence = { ...state.presence };
      for (const { userId, online, lastSeenAt } of action.statuses)
        presence[userId] = { online, lastSeenAt };
      return { ...state, presence };
    }

    case 'reset':
      return initialChatState;

    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}
