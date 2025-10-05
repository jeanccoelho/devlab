import { useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile({ full_name: fullName });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">Perfil</h1>
      <p className="text-bolt-elements-textSecondary mb-8">
        Gerencie suas informações pessoais
      </p>

      <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 border border-bolt-elements-borderColor">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textPrimary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Role
            </label>
            <input
              type="text"
              value={user.role === 'admin' ? 'Administrador' : 'Usuário'}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textSecondary cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Membro desde
            </label>
            <input
              type="text"
              value={new Date(user.created_at).toLocaleDateString('pt-BR')}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor text-bolt-elements-textSecondary cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text font-medium hover:bg-bolt-elements-button-primary-backgroundHover transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}
