import { useState, useRef, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { useAuth } from '~/contexts/AuthContext';
import { classNames } from '~/utils/classNames';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isLowBalance = user.token_balance < 10;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={classNames(
          'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
          'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive',
        )}
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-400 dark:to-gray-500 flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-bolt-elements-textPrimary leading-tight">
            {user.full_name}
          </div>
          <div className="text-xs text-bolt-elements-textSecondary leading-tight">
            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
          </div>
        </div>
        <div
          className={classNames('i-ph:caret-down text-bolt-elements-textSecondary transition-transform', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor shadow-lg overflow-hidden z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-bolt-elements-borderColor">
            <div className="text-sm font-medium text-bolt-elements-textPrimary">{user.full_name}</div>
            <div
              className={classNames('text-xs mt-1', {
                'text-yellow-500': isLowBalance,
                'text-bolt-elements-textSecondary': !isLowBalance,
              })}
            >
              {user.token_balance} tokens disponíveis
            </div>
          </div>

          <div className="py-1">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive transition-colors"
              role="menuitem"
            >
              <div className="i-ph:user text-lg" />
              <span>Meu Perfil</span>
            </Link>

            <Link
              to="/dashboard/tokens"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive transition-colors"
              role="menuitem"
            >
              <div className="i-ph:coins text-lg" />
              <span>Comprar Tokens</span>
            </Link>

            {user.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive transition-colors"
                role="menuitem"
              >
                <div className="i-ph:shield-check text-lg" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          <div className="border-t border-bolt-elements-borderColor py-1">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={classNames(
                'flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors',
                {
                  'text-bolt-elements-item-contentDanger hover:bg-bolt-elements-item-backgroundDanger':
                    !isLoggingOut,
                  'text-bolt-elements-textSecondary cursor-not-allowed': isLoggingOut,
                },
              )}
              role="menuitem"
            >
              <div className={classNames('text-lg', isLoggingOut ? 'i-svg-spinners:90-ring-with-bg' : 'i-ph:sign-out')} />
              <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
