import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase.client';
import type { Database } from '~/types/database';

interface Stats {
  totalUsers: number;
  totalRevenue: number;
  totalTokensSold: number;
  totalTokensConsumed: number;
  activeUsers: number;
}

type Transaction = Database['public']['Tables']['transactions']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTokensSold: 0,
    totalTokensConsumed: 0,
    activeUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersResult, transactionsResult, tokensResult] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, status'),
        supabase.from('user_profiles').select('total_tokens_purchased, total_tokens_consumed, token_balance'),
      ]);

      const completedTransactions = (transactionsResult.data as Transaction[] | null)?.filter((t) => t.status === 'completed') || [];
      const totalRevenue = completedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalTokensSold = (tokensResult.data as Pick<UserProfile, 'total_tokens_purchased' | 'total_tokens_consumed' | 'token_balance'>[] | null)?.reduce((sum, u) => sum + u.total_tokens_purchased, 0) || 0;
      const totalTokensConsumed = (tokensResult.data as Pick<UserProfile, 'total_tokens_purchased' | 'total_tokens_consumed' | 'token_balance'>[] | null)?.reduce((sum, u) => sum + u.total_tokens_consumed, 0) || 0;
      const activeUsers = (tokensResult.data as Pick<UserProfile, 'total_tokens_purchased' | 'total_tokens_consumed' | 'token_balance'>[] | null)?.filter((u) => u.token_balance > 0).length || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalRevenue,
        totalTokensSold,
        totalTokensConsumed,
        activeUsers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-bolt-elements-button-primary-background"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary">Dashboard Admin</h1>
        <p className="text-bolt-elements-textSecondary mt-1">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Total de Usuários</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {stats.totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-bolt-elements-textSecondary mt-4">
            {stats.activeUsers} ativos com saldo
          </p>
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Receita Total</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bolt-elements-textSecondary">Tokens Vendidos</p>
              <p className="text-3xl font-bold text-bolt-elements-textPrimary mt-2">
                {stats.totalTokensSold.toLocaleString()}
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
          <p className="text-xs text-bolt-elements-textSecondary mt-4">
            {stats.totalTokensConsumed.toLocaleString()} consumidos
          </p>
        </div>
      </div>

      <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
        <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/users"
            className="p-4 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">
                  Gerenciar Usuários
                </p>
                <p className="text-xs text-bolt-elements-textSecondary">
                  Ver e editar usuários
                </p>
              </div>
            </div>
          </a>

          <a
            href="/admin/packages"
            className="p-4 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">
                  Pacotes de Tokens
                </p>
                <p className="text-xs text-bolt-elements-textSecondary">
                  Gerenciar pacotes
                </p>
              </div>
            </div>
          </a>

          <a
            href="/admin/analytics"
            className="p-4 bg-bolt-elements-background-depth-1 rounded-lg hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">
                  Analíticas
                </p>
                <p className="text-xs text-bolt-elements-textSecondary">
                  Relatórios detalhados
                </p>
              </div>
            </div>
          </a>

          <div className="p-4 bg-bolt-elements-background-depth-1 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">
                  Configurações
                </p>
                <p className="text-xs text-bolt-elements-textSecondary">
                  Em breve
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
