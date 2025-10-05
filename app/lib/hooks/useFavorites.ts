import { useCallback, useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase.client';
import { toast } from 'react-toastify';

export interface Favorite {
  id: string;
  chat_id: string;
  title: string;
  created_at: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('chat_favorites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFavorites(data || []);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      toast.error('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  }, []);

  const addFavorite = useCallback(async (chatId: string, title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Você precisa estar logado para adicionar favoritos');
        return false;
      }

      const { error } = await supabase
        .from('chat_favorites')
        .insert({
          user_id: session.user.id,
          chat_id: chatId,
          title: title,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Este chat já está nos favoritos');
          return false;
        }
        throw error;
      }

      toast.success('Adicionado aos favoritos');
      await loadFavorites();
      return true;
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      toast.error('Erro ao adicionar favorito');
      return false;
    }
  }, [loadFavorites]);

  const removeFavorite = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chat_favorites')
        .delete()
        .eq('chat_id', chatId);

      if (error) throw error;

      toast.success('Removido dos favoritos');
      await loadFavorites();
      return true;
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      toast.error('Erro ao remover favorito');
      return false;
    }
  }, [loadFavorites]);

  const isFavorite = useCallback((chatId: string) => {
    return favorites.some(fav => fav.chat_id === chatId);
  }, [favorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    refresh: loadFavorites,
  };
}
