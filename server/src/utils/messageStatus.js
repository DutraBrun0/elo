/** @typedef {'sent' | 'delivered' | 'read'} MessageStatus */

/**
 * @typedef {object} Watermark
 * @property {string} userId
 * @property {Date | null} lastDeliveredAt
 * @property {Date | null} lastReadAt
 */

/**
 * Deriva o status de uma mensagem a partir das marcas d'água dos participantes.
 * A mensagem só é "lida"/"entregue" quando TODOS os destinatários chegaram lá —
 * a mesma regra serve para conversas 1 a 1 e para grupos.
 *
 * @param {{ senderId: string, createdAt: Date }} message
 * @param {Watermark[]} participants Todos os participantes da conversa (o remetente é ignorado).
 * @returns {MessageStatus}
 */
export function deriveMessageStatus(message, participants) {
  const recipients = participants.filter((p) => p.userId !== message.senderId);
  if (recipients.length === 0) return 'sent';

  const sentAt = message.createdAt.getTime();
  const reached = (date) => date !== null && date.getTime() >= sentAt;

  if (recipients.every((p) => reached(p.lastReadAt))) return 'read';
  // Ler implica ter recebido, então lastReadAt também conta como entrega.
  if (recipients.every((p) => reached(p.lastDeliveredAt) || reached(p.lastReadAt))) {
    return 'delivered';
  }
  return 'sent';
}
