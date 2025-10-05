import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase.client';
import type { TokenPackage } from '~/types/auth';
import { toast } from 'react-toastify';

export default function TokensPage() {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('token_packages')
        .select('*')
        .eq('is_active', true)
        .order('token_amount', { ascending: true });

      if (error) throw error;
      if (data) setPackages(data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Erro ao carregar pacotes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = (pkg: TokenPackage) => {
    toast.info('Integração de pagamento em desenvolvimento. Em breve você poderá comprar tokens!');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">
        Comprar Tokens
      </h1>
      <p className="text-bolt-elements-textSecondary mb-8">
        Escolha o pacote ideal para suas necessidades
      </p>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-bolt-elements-button-primary-background"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor hover:border-bolt-elements-button-primary-background transition-colors"
            >
              <h3 className="text-xl font-bold text-bolt-elements-textPrimary mb-2">
                {pkg.name}
              </h3>
              <p className="text-sm text-bolt-elements-textSecondary mb-4">
                {pkg.description}
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-bolt-elements-textPrimary">
                    R$ {pkg.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-bolt-elements-textSecondary mt-2">
                  {pkg.token_amount.toLocaleString()} tokens
                </p>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                className="w-full py-3 px-4 rounded-lg bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text font-medium hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
              >
                Comprar Agora
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2">
          Como funcionam os tokens?
        </h3>
        <ul className="space-y-2 text-sm text-bolt-elements-textSecondary">
          <li>• Cada mensagem na IA consome tokens baseado no tamanho</li>
          <li>• Tokens nunca expiram - use quando quiser</li>
          <li>• Compre mais tokens a qualquer momento</li>
          <li>• Acompanhe seu uso no histórico</li>
        </ul>
      </div>
    </div>
  );
}
