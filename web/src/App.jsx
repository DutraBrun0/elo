import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { ChatProvider } from './contexts/ChatContext.jsx';
import { Spinner } from './components/ui/Spinner.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';

/** Só renderiza para usuários logados; socket e chat existem apenas dentro da sessão. */
function ProtectedRoutes() {
  const { status } = useAuth();
  if (status === 'loading') return <Spinner className="h-dvh w-full" />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return (
    <SocketProvider>
      <ChatProvider>
        <Outlet />
      </ChatProvider>
    </SocketProvider>
  );
}

function PublicOnlyRoutes() {
  const { status } = useAuth();
  if (status === 'loading') return <Spinner className="h-dvh w-full" />;
  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoutes />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/c/:conversationId" element={<ChatPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
