import { useParams } from 'react-router';
import { ChatPanel } from '../components/chat/ChatPanel.jsx';
import { EmptyChat } from '../components/chat/EmptyChat.jsx';
import { Sidebar } from '../components/sidebar/Sidebar.jsx';

/**
 * Layout responsivo: no desktop, lista e chat lado a lado; no celular, um de cada vez —
 * a rota /c/:id decide qual aparece (e o botão "voltar" do navegador funciona).
 * A `key` remonta o painel ao trocar de conversa: scroll, rascunho e digitação recomeçam do zero.
 */
export function ChatPage() {
  const { conversationId } = useParams();
  const open = Boolean(conversationId);

  return (
    <div className="mx-auto flex h-dvh max-w-[1600px] md:border-x md:border-line">
      <Sidebar className={`w-full md:w-[340px] lg:w-[380px] ${open ? 'hidden md:flex' : 'flex'}`} />
      <main className={`min-w-0 flex-1 flex-col ${open ? 'flex' : 'hidden md:flex'}`}>
        {open ? <ChatPanel key={conversationId} conversationId={conversationId} /> : <EmptyChat />}
      </main>
    </div>
  );
}
