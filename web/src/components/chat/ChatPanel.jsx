import { useCallback, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useChat } from '../../contexts/ChatContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { ChatHeader } from './ChatHeader.jsx';
import { Composer } from './Composer.jsx';
import { MessageList } from './MessageList.jsx';

export function ChatPanel({ conversationId }) {
  const { user } = useAuth();
  const chat = useChat();
  const { setActiveConversation, loadMessages, sendMessage, retryMessage, setTyping } = chat;

  const conversation = chat.conversations.find((c) => c.id === conversationId);
  const thread = chat.messages[conversationId];
  const contact = conversation?.participants[0];
  const isTyping = Boolean(contact && chat.typing[conversationId]?.[contact.id]);

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  const loadOlder = useCallback(
    () => loadMessages(conversationId, { older: true }),
    [conversationId, loadMessages],
  );

  if (!conversation) {
    if (chat.conversationsStatus !== 'ready') return <Spinner className="flex-1" />;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted">Conversa não encontrada.</p>
        <Link to="/">
          <Button>Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`Conversa com ${contact?.name}`}>
      <ChatHeader contact={contact} presence={chat.presence[contact?.id]} isTyping={isTyping} />

      {thread?.status === 'ready' ? (
        <MessageList
          thread={thread}
          me={user.id}
          onLoadOlder={loadOlder}
          onRetry={retryMessage}
          typingName={isTyping ? contact.name : null}
        />
      ) : thread?.status === 'error' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-muted">Não foi possível carregar as mensagens.</p>
          <Button onClick={() => loadMessages(conversationId)}>Tentar de novo</Button>
        </div>
      ) : (
        <Spinner className="flex-1" label="Carregando mensagens" />
      )}

      <Composer
        onSend={(content) => sendMessage(conversationId, content)}
        onTyping={(typing) => setTyping(conversationId, typing)}
      />
    </section>
  );
}
