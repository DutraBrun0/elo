const variants = {
  // Botão padrão do sistema: transparente, borda de 1px, texto branco.
  ghost: 'border border-line text-fg hover:border-muted disabled:hover:border-line',
  // Ação discreta, sem borda (ícones em cabeçalhos, links).
  quiet: 'text-muted hover:text-fg',
};

const sizes = {
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 justify-center',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center gap-2 rounded-md font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
