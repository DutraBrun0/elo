import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react';

const config = {
  pending: { Icon: Clock, className: 'text-subtle', label: 'Enviando' },
  sent: { Icon: Check, className: 'text-subtle', label: 'Enviada' },
  delivered: { Icon: CheckCheck, className: 'text-sky', label: 'Entregue' },
  read: { Icon: CheckCheck, className: 'text-iris-glow', label: 'Lida' },
  failed: { Icon: AlertCircle, className: 'text-alarm', label: 'Falhou' },
};

/** Ícone de status: relógio → ✓ enviada → ✓✓ azul entregue → ✓✓ violeta lida. */
export function MessageStatus({ status }) {
  const { Icon, className, label } = config[status] ?? config.sent;
  return (
    <span title={label} className={`inline-flex ${className}`}>
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
