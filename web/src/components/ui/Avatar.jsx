import { initials } from '../../lib/format.js';

const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm' };

/** Avatar com iniciais e, opcionalmente, ponto de presença (verde = online). */
export function Avatar({ user, size = 'md', online }) {
  return (
    <span className="relative inline-flex shrink-0">
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className={`${sizes[size]} rounded-full border border-line object-cover`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${sizes[size]} inline-flex items-center justify-center rounded-full border border-line font-mono text-body`}
        >
          {initials(user?.name)}
        </span>
      )}
      {online && (
        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-canvas bg-pulse">
          <span className="sr-only">online</span>
        </span>
      )}
    </span>
  );
}
