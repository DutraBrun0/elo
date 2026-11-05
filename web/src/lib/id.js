/** Id temporário para mensagens otimistas (substituído pelo id real no ack). */
export const tempId = () =>
  `tmp-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
