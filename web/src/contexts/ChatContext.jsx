import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { conversationsApi } from '../api/endpoints.js';
import { chatReducer, initialChatState } from '../lib/chatReducer.js';
import { tempId as createTempId } from '../lib/id.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const ChatContext = createContext(null);

const TYPING_TTL_MS = 5000;

/**
 * Orquestra o chat: carrega dados pela API REST, reage aos eventos do socket e expõe
 * ações para a UI. A conversa ativa é informada pela rota (setActiveConversation).
 */
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  // Refs dão aos listeners do socket acesso ao valor atual sem re-registrá-los a cada render.
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const activeIdRef = useRef(null);
  const typingTimers = useRef(new Map());

  const isReading = (conversationId) =>
    activeIdRef.current === conversationId && document.visibilityState === 'visible';

  const markRead = useCallback(
    (conversationId) => {
      dispatch({ type: 'conversation/read', conversationId });
      socket?.emit('conversation:read', { conversationId });
    },
    [socket],
  );

  const requestPresence = useCallback(
    (conversations) => {
      const userIds = [...new Set(conversations.flatMap((c) => c.participants.map((p) => p.id)))];
      if (!socket || userIds.length === 0) return;
      socket.emit('presence:get', { userIds: userIds.slice(0, 100) }, (res) => {
        if (res?.ok) dispatch({ type: 'presence', statuses: res.statuses });
      });
    },
    [socket],
  );

  const loadConversations = useCallback(async () => {
    dispatch({ type: 'conversations/loading' });
    try {
      const { conversations } = await conversationsApi.list();
      dispatch({ type: 'conversations/loaded', conversations });
      requestPresence(conversations);
    } catch {
      dispatch({ type: 'conversations/failed' });
    }
  }, [requestPresence]);

  const loadMessages = useCallback(async (conversationId, { older = false } = {}) => {
    const thread = stateRef.current.messages[conversationId];
    if (older && (!thread?.nextCursor || thread.loadingOlder)) return;

    dispatch({ type: 'messages/loading', conversationId, older });
    try {
      const page = await conversationsApi.messages(
        conversationId,
        older ? thread.nextCursor : undefined,
      );
      dispatch({ type: 'messages/loaded', conversationId, older, ...page });
    } catch {
      dispatch({ type: 'messages/failed', conversationId });
    }
  }, []);

  /** Abre (ou cria) a conversa com um usuário e devolve o id. */
  const openConversationWith = useCallback(
    async (otherUser) => {
      const { conversation } = await conversationsApi.openDirect(otherUser.id);
      dispatch({ type: 'conversations/upsert', conversation });
      requestPresence([conversation]);
      return conversation.id;
    },
    [requestPresence],
  );

  const emitMessage = useCallback(
    (message) => {
      if (!socket?.connected) {
        dispatch({
          type: 'message/failed',
          tempId: message.id,
          conversationId: message.conversationId,
        });
        return;
      }
      socket
        .timeout(10_000)
        .emit(
          'message:send',
          { conversationId: message.conversationId, content: message.content, tempId: message.id },
          (err, res) => {
            if (err || !res?.ok) {
              dispatch({
                type: 'message/failed',
                tempId: message.id,
                conversationId: message.conversationId,
              });
            } else {
              dispatch({ type: 'message/confirmed', tempId: res.tempId, message: res.message });
            }
          },
        );
    },
    [socket],
  );

  /** UI otimista: a mensagem aparece na hora e é confirmada (ou marcada como falha) pelo ack. */
  const sendMessage = useCallback(
    (conversationId, content) => {
      const message = {
        id: createTempId(),
        conversationId,
        senderId: user.id,
        type: 'TEXT',
        content,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      dispatch({ type: 'message/pending', message });
      emitMessage(message);
    },
    [user, emitMessage],
  );

  const retryMessage = useCallback(
    (message) => {
      dispatch({
        type: 'message/retry',
        tempId: message.id,
        conversationId: message.conversationId,
      });
      emitMessage(message);
    },
    [emitMessage],
  );

  const setTyping = useCallback(
    (conversationId, isTyping) =>
      socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId }),
    [socket],
  );

  const setActiveConversation = useCallback(
    (conversationId) => {
      activeIdRef.current = conversationId;
      if (!conversationId) return;
      if (stateRef.current.messages[conversationId]?.status !== 'ready')
        loadMessages(conversationId);
      markRead(conversationId);
    },
    [loadMessages, markRead],
  );

  // Eventos do servidor.
  useEffect(() => {
    if (!socket) return undefined;

    const onReady = () => {
      // Conectou ou reconectou: ressincroniza o que pode ter sido perdido enquanto offline.
      loadConversations();
      const activeId = activeIdRef.current;
      if (activeId) {
        loadMessages(activeId);
        markRead(activeId);
      }
    };

    const onMessage = (message) => {
      const fromMe = message.senderId === user.id;
      if (!stateRef.current.conversations.some((c) => c.id === message.conversationId)) {
        // Conversa nova iniciada por outra pessoa: recarrega a lista para obtê-la completa.
        loadConversations();
      }
      const reading = isReading(message.conversationId);
      dispatch({ type: 'message/received', message, unread: !fromMe && !reading });
      if (fromMe) return;
      dispatch({
        type: 'typing',
        conversationId: message.conversationId,
        userId: message.senderId,
        isTyping: false,
      });
      socket.emit(reading ? 'conversation:read' : 'conversation:delivered', {
        conversationId: message.conversationId,
      });
    };

    const onReceipt = (receipt) => dispatch({ type: 'receipt', me: user.id, ...receipt });
    const onReadElsewhere = ({ conversationId }) =>
      dispatch({ type: 'conversation/read', conversationId });
    const onPresence = (status) => dispatch({ type: 'presence', statuses: [status] });

    const onTyping = ({ conversationId, userId, isTyping }) => {
      const key = `${conversationId}:${userId}`;
      clearTimeout(typingTimers.current.get(key));
      dispatch({ type: 'typing', conversationId, userId, isTyping });
      // Se o "typing:stop" se perder, o indicador expira sozinho.
      if (isTyping) {
        typingTimers.current.set(
          key,
          setTimeout(
            () => dispatch({ type: 'typing', conversationId, userId, isTyping: false }),
            TYPING_TTL_MS,
          ),
        );
      }
    };

    const handlers = {
      ready: onReady,
      'message:new': onMessage,
      'receipt:update': onReceipt,
      'conversation:read': onReadElsewhere,
      'presence:update': onPresence,
      'typing:update': onTyping,
    };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    if (socket.connected) onReady();

    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
  }, [socket, user, loadConversations, loadMessages, markRead]);

  // Voltar para a aba marca como lida a conversa aberta.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeIdRef.current)
        markRead(activeIdRef.current);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead]);

  useEffect(() => {
    const timers = typingTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      loadConversations,
      loadMessages,
      openConversationWith,
      sendMessage,
      retryMessage,
      setTyping,
      setActiveConversation,
    }),
    [
      state,
      loadConversations,
      loadMessages,
      openConversationWith,
      sendMessage,
      retryMessage,
      setTyping,
      setActiveConversation,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat precisa estar dentro de <ChatProvider>');
  return context;
}
