import { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase.client';
import type { TokenUsage, Transaction } from '~/types/auth';

export default function DashboardIndex() {
  const { user } = useAuth();
  const [recentUsage, setRecentUsage] = useState<TokenUsage[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const [usageResult, transactionsResult] = await Promise.all([
        supabase
          .from('token_usage')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (usageResult.data) setRecentUsage(usageResult.data);
      if (transactionsResult.data) setRecentTransactions(transactionsResult.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const consumptionRate =
    user.total_tokens_purchased > 0
      ? ((user.total_tokens_consumed / user.total_tokens_purchased) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary">
          Olá, {user.full_name || 'Usuário'}!
        </h1>
        <p className="text-bolt-elements-textSecondary mt-1">
          Bem-vindo ao seu dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Saldo de Tokens</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {user.token_balance.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <Link
            to="/dashboard/tokens"
            className="text-sm text-blue-500 hover:underline mt-4 inline-block"
          >
            Comprar mais tokens →
          </Link>
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Tokens Consumidos</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {user.total_tokens_consumed.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Tokens Comprados</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {user.total_tokens_purchased.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Taxa de Consumo</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {consumptionRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">
              Uso Recente
            </h2>
            <Link
              to="/dashboard/usage"
              className="text-sm text-blue-500 hover:underline"
            >
              Ver tudo
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-bolt-elements-textSecondary">
              Carregando...
            </div>
          ) : recentUsage.length === 0 ? (
            <div className="text-center py-8 text-bolt-elements-textSecondary">
              Nenhum uso registrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsage.map((usage) => (
                <div
                  key={usage.id}
                  className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-1 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-bolt-elements-textPrimary">
                      {usage.model_used || 'Chat'}
                    </p>
                    <p className="text-xs text-bolt-elements-textSecondary mt-1">
                      {new Date(usage.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-bolt-elements-textPrimary">
                      {usage.tokens_consumed} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary">
              Transações Recentes
            </h2>
            <Link
              to="/dashboard/transactions"
              className="text-sm text-blue-500 hover:underline"
            >
              Ver tudo
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-bolt-elements-textSecondary">
              Carregando...
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-bolt-elements-textSecondary">
              Nenhuma transação ainda
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-1 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-bolt-elements-textPrimary">
                      {transaction.token_amount} tokens
                    </p>
                    <p className="text-xs text-bolt-elements-textSecondary mt-1">
                      {new Date(transaction.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-500">
                      R$ {transaction.amount.toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        transaction.status === 'completed'
                          ? 'bg-green-500/20 text-green-500'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {transaction.status === 'completed'
                        ? 'Completo'
                        : transaction.status === 'pending'
                        ? 'Pendente'
                        : 'Falhou'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
