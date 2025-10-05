import { useEffect, useRef } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useNavigate } from '@remix-run/react';
import { toast } from 'react-toastify';

const LOW_BALANCE_THRESHOLD = 50;
const CRITICAL_BALANCE_THRESHOLD = 10;

export function useTokenBalance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasShownLowBalanceWarning = useRef(false);
  const hasShownCriticalBalanceWarning = useRef(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.token_balance <= CRITICAL_BALANCE_THRESHOLD && !hasShownCriticalBalanceWarning.current) {
      hasShownCriticalBalanceWarning.current = true;
      toast.warning(
        <div>
          <strong className="block mb-1 text-red-400">⚠️ Saldo Crítico!</strong>
          <p className="text-xs mb-2">Você tem apenas {user.token_balance} tokens restantes.</p>
          <button
            onClick={() => {
              toast.dismiss();
              navigate('/dashboard/tokens');
            }}
            className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
          >
            Comprar Agora
          </button>
        </div>,
        {
          autoClose: false,
          closeButton: true,
        }
      );
    } else if (
      user.token_balance <= LOW_BALANCE_THRESHOLD &&
      user.token_balance > CRITICAL_BALANCE_THRESHOLD &&
      !hasShownLowBalanceWarning.current
    ) {
      hasShownLowBalanceWarning.current = true;
      toast.info(
        <div>
          <strong className="block mb-1">Saldo Baixo</strong>
          <p className="text-xs mb-2">Você tem {user.token_balance} tokens. Considere recarregar.</p>
          <button
            onClick={() => {
              toast.dismiss();
              navigate('/dashboard/tokens');
            }}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            Ver Pacotes
          </button>
        </div>,
        {
          autoClose: 10000,
        }
      );
    }

    if (user.token_balance > LOW_BALANCE_THRESHOLD) {
      hasShownLowBalanceWarning.current = false;
      hasShownCriticalBalanceWarning.current = false;
    }
  }, [user?.token_balance, navigate]);

  return {
    balance: user?.token_balance ?? 0,
    isLowBalance: (user?.token_balance ?? 0) <= LOW_BALANCE_THRESHOLD,
    isCriticalBalance: (user?.token_balance ?? 0) <= CRITICAL_BALANCE_THRESHOLD,
  };
}
