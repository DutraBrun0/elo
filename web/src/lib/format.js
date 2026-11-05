const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const longDate = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysAgo = (date) => Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

/** "14:32" */
export const formatTime = (value) => time.format(new Date(value));

/** Horário na lista de conversas: hoje → hora, ontem, dia da semana, ou data. */
export function formatListDate(value) {
  const date = new Date(value);
  const days = daysAgo(date);
  if (days === 0) return time.format(date);
  if (days === 1) return 'ontem';
  if (days < 7) return weekday.format(date).replace('.', '');
  return shortDate.format(date);
}

/** Separador de dia no histórico: "Hoje", "Ontem" ou "3 de março de 2026". */
export function formatDayDivider(value) {
  const days = daysAgo(new Date(value));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return longDate.format(new Date(value));
}

export const isSameDay = (a, b) =>
  startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();

/** "online", "visto hoje às 14:32", "visto ontem às 09:10", "visto em 03/03/26". */
export function formatPresence(presence) {
  if (!presence) return '';
  if (presence.online) return 'online';
  if (!presence.lastSeenAt) return '';
  const date = new Date(presence.lastSeenAt);
  const days = daysAgo(date);
  if (days === 0) return `visto hoje às ${time.format(date)}`;
  if (days === 1) return `visto ontem às ${time.format(date)}`;
  return `visto em ${shortDate.format(date)}`;
}

/** Iniciais para o avatar: "Ada Lovelace" → "AL". */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}
