/*
  # Criar tabela project_deployments

  1. Nova Tabela
    - `project_deployments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key -> projects)
      - `user_id` (uuid, foreign key -> auth.users)
      - `platform` (enum: netlify, vercel, cloudflare)
      - `deployment_url` (text)
      - `deployment_id` (text)
      - `status` (enum: pending, deploying, success, failed)
      - `error_message` (text)
      - `created_at` (timestamptz)
      
  2. Segurança
    - Habilitar RLS
    - Usuários podem ver apenas seus próprios deployments
    - Usuários podem criar deployments apenas para seus próprios projetos
*/

-- Criar tipos ENUM se não existirem
DO $$ BEGIN
  CREATE TYPE deployment_platform AS ENUM ('netlify', 'vercel', 'cloudflare');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deployment_status AS ENUM ('pending', 'deploying', 'success', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela project_deployments
CREATE TABLE IF NOT EXISTS project_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform deployment_platform NOT NULL,
  deployment_url text DEFAULT '',
  deployment_id text DEFAULT '',
  status deployment_status NOT NULL DEFAULT 'pending',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios deployments
CREATE POLICY "Users can view own deployments"
  ON project_deployments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuários podem criar deployments para seus projetos
CREATE POLICY "Users can create deployments for own projects"
  ON project_deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id AND projects.user_id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar seus próprios deployments
CREATE POLICY "Users can update own deployments"
  ON project_deployments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios deployments
CREATE POLICY "Users can delete own deployments"
  ON project_deployments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_project_deployments_user_id ON project_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_project_id ON project_deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_status ON project_deployments(status);
