export function Spinner({ className = '', label = 'Carregando' }) {
  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border border-line border-t-body" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
