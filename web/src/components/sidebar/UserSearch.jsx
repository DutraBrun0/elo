import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { usersApi } from '../../api/endpoints.js';
import { useChat } from '../../contexts/ChatContext.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { Avatar } from '../ui/Avatar.jsx';
import { Spinner } from '../ui/Spinner.jsx';

/** Resultados da busca de usuários; clicar abre (ou cria) a conversa. */
export function UserSearchResults({ query, onDone }) {
  const debounced = useDebouncedValue(query.trim());
  // O resultado guarda a busca a que pertence: "carregando" é derivado (termo atual ≠ termo
  // do último resultado), sem precisar de setState síncrono dentro do efeito.
  const [result, setResult] = useState({ query: '', users: [], failed: false });
  const { openConversationWith } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    if (!debounced) return undefined;
    let cancelled = false; // ignora respostas de buscas antigas que cheguem fora de ordem
    usersApi
      .search(debounced)
      .then(({ users }) => !cancelled && setResult({ query: debounced, users, failed: false }))
      .catch(() => !cancelled && setResult({ query: debounced, users: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const open = async (user) => {
    const conversationId = await openConversationWith(user);
    onDone();
    navigate(`/c/${conversationId}`);
  };

  const loading = result.query !== debounced || debounced !== query.trim();
  if (loading && !result.users.length) return <Spinner className="py-8" />;
  if (result.failed) return <Hint>Não foi possível buscar agora.</Hint>;
  if (!loading && !result.users.length) return <Hint>Ninguém encontrado para “{debounced}”.</Hint>;

  return (
    <ul className="flex flex-col gap-1">
      {result.users.map((user) => (
        <li key={user.id}>
          <button
            type="button"
            onClick={() => open(user)}
            className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-3 text-left transition-colors duration-150 hover:border-line"
          >
            <Avatar user={user} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{user.name}</span>
              <span className="block truncate font-mono text-xs text-iris">@{user.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Hint({ children }) {
  return <p className="px-3 py-8 text-center text-sm text-muted">{children}</p>;
}
