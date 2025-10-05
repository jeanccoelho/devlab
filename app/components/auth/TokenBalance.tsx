import { useAuth } from '~/contexts/AuthContext';
import { Link } from '@remix-run/react';

export function TokenBalance() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isLowBalance = user.token_balance < 50;

  return (
    <Link
      to="/dashboard/tokens"
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isLowBalance
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3'
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-medium">{user.token_balance.toLocaleString()} tokens</span>
      {isLowBalance && (
        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
          Baixo
        </span>
      )}
    </Link>
  );
}
