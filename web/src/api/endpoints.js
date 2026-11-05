import { api } from './client.js';

export const authApi = {
  register: (data) => api('/auth/register', { method: 'POST', body: data }),
  login: (data) => api('/auth/login', { method: 'POST', body: data }),
  me: () => api('/auth/me'),
};

export const usersApi = {
  search: (q) => api('/users/search', { query: { q, limit: 10 } }),
};

export const conversationsApi = {
  list: () => api('/conversations'),
  openDirect: (userId) => api('/conversations/direct', { method: 'POST', body: { userId } }),
  messages: (conversationId, cursor) =>
    api(`/conversations/${conversationId}/messages`, { query: { cursor, limit: 30 } }),
};
