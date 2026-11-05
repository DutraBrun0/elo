/** Marca do Elo: dois anéis entrelaçados — um neutro, um violeta. */
export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12.5" cy="16" r="7" stroke="var(--color-body)" strokeWidth="1.75" />
      <circle cx="19.5" cy="16" r="7" stroke="var(--color-iris)" strokeWidth="1.75" />
    </svg>
  );
}

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-2xl leading-none tracking-tight text-fg">elo</span>
    </span>
  );
}
