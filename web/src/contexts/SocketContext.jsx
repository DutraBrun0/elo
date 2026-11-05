import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

/**
 * Mantém uma única conexão Socket.IO enquanto houver sessão. O token vai no handshake;
 * se o servidor recusar (token expirado), a sessão é encerrada.
 */
export function SocketProvider({ children }) {
  const { token, logout } = useAuth();
  const [connected, setConnected] = useState(false);

  // Um socket por token; a conexão em si é aberta/fechada pelo efeito abaixo.
  const socket = useMemo(
    () => (token ? io({ auth: { token }, transports: ['websocket'], autoConnect: false }) : null),
    [token],
  );

  useEffect(() => {
    if (!socket) return undefined;

    const onReady = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = (error) => {
      if (error.message === 'UNAUTHORIZED') logout();
    };

    socket.on('ready', onReady);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.connect();

    return () => {
      socket.disconnect();
      socket.off('ready', onReady);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, [socket, logout]);

  const value = useMemo(
    () => ({ socket, connected: Boolean(socket) && connected }),
    [socket, connected],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket precisa estar dentro de <SocketProvider>');
  return context;
}
