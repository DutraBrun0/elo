import { useId } from 'react';

/** Campo de formulário com rótulo e erro acessíveis (aria-invalid / aria-describedby). */
export function Field({ label, error, hint, className = '', ...props }) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        className="h-11 rounded-md border border-line bg-canvas px-3 text-body placeholder:text-faint transition-colors duration-150 hover:border-subtle focus:border-iris focus:outline-none aria-invalid:border-alarm/70"
        {...props}
      />
      {message && (
        <p id={messageId} className={`font-mono text-xs ${error ? 'text-alarm' : 'text-subtle'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
