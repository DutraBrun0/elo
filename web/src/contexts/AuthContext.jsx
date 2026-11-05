import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints.js';
import { tokenStorage } from '../api/client.js';

const AuthContext = createContext(null);

/** Sessão do usuário: valida o token salvo ao abrir o app e expõe login/cadastro/logout. */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(token ? 'loading' : 'anonymous');

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    if (!token || user) return;
    authApi
      .me()
      .then(({ user: me }) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(logout);
  }, [token, user, logout]);

  // Qualquer 401 da API (token expirado) encerra a sessão.
  useEffect(() => {
    window.addEventListener('elo:unauthorized', logout);
    return () => window.removeEventListener('elo:unauthorized', logout);
  }, [logout]);

  const authenticate = useCallback(async (request) => {
    const result = await request;
    tokenStorage.set(result.token);
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return result.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      login: (credentials) => authenticate(authApi.login(credentials)),
      register: (data) => authenticate(authApi.register(data)),
      logout,
    }),
    [user, token, status, authenticate, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}
