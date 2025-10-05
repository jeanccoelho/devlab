/*
  # Sistema de Favoritos para Conversas
  
  1. Nova Tabela
    - `chat_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `chat_id` (text, ID do chat no IndexedDB)
      - `title` (text, título do chat)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Segurança
    - Habilitar RLS na tabela `chat_favorites`
    - Adicionar política para usuários autenticados lerem seus próprios favoritos
    - Adicionar política para usuários autenticados criarem seus favoritos
    - Adicionar política para usuários autenticados deletarem seus favoritos
  
  3. Índices
    - Criar índice na coluna `user_id` para buscas rápidas
    - Criar índice composto em `user_id` e `chat_id` para verificação de duplicatas
*/

CREATE TABLE IF NOT EXISTS chat_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chat_id)
);

ALTER TABLE chat_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON chat_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON chat_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON chat_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_favorites_user_id ON chat_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_favorites_user_chat ON chat_favorites(user_id, chat_id);
