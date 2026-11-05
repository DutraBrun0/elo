import { deriveMessageStatus } from '../../src/utils/messageStatus.js';

const sentAt = new Date('2026-01-01T12:00:00Z');
const before = new Date('2026-01-01T11:59:59Z');
const after = new Date('2026-01-01T12:00:01Z');
const message = { senderId: 'ana', createdAt: sentAt };
const sender = { userId: 'ana', lastDeliveredAt: after, lastReadAt: after };

describe('deriveMessageStatus', () => {
  it('é "sent" quando o destinatário ainda não recebeu', () => {
    const bia = { userId: 'bia', lastDeliveredAt: before, lastReadAt: null };
    expect(deriveMessageStatus(message, [sender, bia])).toBe('sent');
  });

  it('é "delivered" quando a entrega alcançou a mensagem', () => {
    const bia = { userId: 'bia', lastDeliveredAt: sentAt, lastReadAt: before };
    expect(deriveMessageStatus(message, [sender, bia])).toBe('delivered');
  });

  it('é "read" quando a leitura alcançou a mensagem, mesmo sem marca de entrega', () => {
    const bia = { userId: 'bia', lastDeliveredAt: null, lastReadAt: after };
    expect(deriveMessageStatus(message, [sender, bia])).toBe('read');
  });

  it('em grupos, só é "read" quando todos leram', () => {
    const bia = { userId: 'bia', lastDeliveredAt: after, lastReadAt: after };
    const caio = { userId: 'caio', lastDeliveredAt: after, lastReadAt: null };
    expect(deriveMessageStatus(message, [sender, bia, caio])).toBe('delivered');
  });

  it('ignora as marcas do próprio remetente', () => {
    expect(deriveMessageStatus(message, [sender])).toBe('sent');
  });
});
