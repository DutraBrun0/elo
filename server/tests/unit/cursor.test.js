import { decodeCursor, encodeCursor } from '../../src/utils/cursor.js';

describe('cursor de paginação', () => {
  it('faz ida e volta preservando data e id', () => {
    const item = { createdAt: new Date('2026-03-04T05:06:07.089Z'), id: 'abc-123' };
    expect(decodeCursor(encodeCursor(item))).toEqual(item);
  });

  it('rejeita cursor adulterado com 400', () => {
    expect(() => decodeCursor('lixo')).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});
