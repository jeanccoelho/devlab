/*
  # Sistema de Projetos e Compartilhamento

  ## 1. Novas Tabelas

  ### `projects`
  - `id` (uuid, primary key) - ID único do projeto
  - `user_id` (uuid, referencia user_profiles) - Proprietário do projeto
  - `name` (text) - Nome do projeto
  - `description` (text) - Descrição do projeto
  - `files` (jsonb) - Estrutura de arquivos do projeto
  - `preview_image` (text) - URL da imagem de preview
  - `is_public` (boolean) - Se o projeto é público
  - `share_token` (text, unique) - Token único para compartilhamento
  - `view_count` (integer) - Contador de visualizações
  - `fork_count` (integer) - Contador de forks
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### `project_deployments`
  - `id` (uuid, primary key) - ID do deployment
  - `project_id` (uuid, referencia projects) - Projeto relacionado
  - `user_id` (uuid, referencia user_profiles) - Usuário que fez deploy
  - `platform` (text) - Plataforma de deploy (netlify, vercel, cloudflare)
  - `deployment_url` (text) - URL do projeto deployado
  - `deployment_id` (text) - ID do deployment na plataforma
  - `status` (text) - Status (pending, deploying, success, failed)
  - `error_message` (text) - Mensagem de erro se falhou
  - `created_at` (timestamptz) - Data do deployment

  ### `project_forks`
  - `id` (uuid, primary key) - ID do fork
  - `original_project_id` (uuid, referencia projects) - Projeto original
  - `forked_project_id` (uuid, referencia projects) - Projeto fork
  - `user_id` (uuid, referencia user_profiles) - Usuário que fez fork
  - `created_at` (timestamptz) - Data do fork

  ## 2. Segurança
  - Habilitar RLS em todas as tabelas
  - Projetos públicos visíveis para todos
  - Projetos privados apenas para o proprietário
  - Deployments visíveis apenas para o proprietário
  - Forks rastreáveis

  ## 3. Funcionalidades
  - Salvar projetos automaticamente
  - Gerar tokens únicos de compartilhamento
  - Rastrear visualizações e forks
  - Histórico de deployments
*/

-- Criar enum para plataformas de deploy
DO $$ BEGIN
  CREATE TYPE deployment_platform AS ENUM ('netlify', 'vercel', 'cloudflare');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de deployment
DO $$ BEGIN
  CREATE TYPE deployment_status AS ENUM ('pending', 'deploying', 'success', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela: projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Project',
  description text DEFAULT '',
  files jsonb NOT NULL DEFAULT '{}',
  preview_image text DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  view_count integer NOT NULL DEFAULT 0,
  fork_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela: project_deployments
CREATE TABLE IF NOT EXISTS project_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  platform deployment_platform NOT NULL,
  deployment_url text DEFAULT '',
  deployment_id text DEFAULT '',
  status deployment_status NOT NULL DEFAULT 'pending',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Tabela: project_forks
CREATE TABLE IF NOT EXISTS project_forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  forked_project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_deployments_project_id ON project_deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_user_id ON project_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_forks_original_id ON project_forks(original_project_id);
CREATE INDEX IF NOT EXISTS idx_project_forks_forked_id ON project_forks(forked_project_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função: incrementar view count
CREATE OR REPLACE FUNCTION increment_project_views(p_project_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE projects
  SET view_count = view_count + 1
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: fazer fork de um projeto
CREATE OR REPLACE FUNCTION fork_project(
  p_original_project_id uuid,
  p_user_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_new_project_id uuid;
  v_original_project projects%ROWTYPE;
BEGIN
  -- Buscar projeto original
  SELECT * INTO v_original_project
  FROM projects
  WHERE id = p_original_project_id AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not public';
  END IF;

  -- Criar novo projeto (fork)
  INSERT INTO projects (
    user_id,
    name,
    description,
    files,
    is_public
  ) VALUES (
    p_user_id,
    v_original_project.name || ' (Fork)',
    v_original_project.description,
    v_original_project.files,
    false
  )
  RETURNING id INTO v_new_project_id;

  -- Registrar fork
  INSERT INTO project_forks (
    original_project_id,
    forked_project_id,
    user_id
  ) VALUES (
    p_original_project_id,
    v_new_project_id,
    p_user_id
  );

  -- Incrementar contador de forks
  UPDATE projects
  SET fork_count = fork_count + 1
  WHERE id = p_original_project_id;

  RETURN v_new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: buscar projeto por share token
CREATE OR REPLACE FUNCTION get_project_by_share_token(p_share_token text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  description text,
  files jsonb,
  preview_image text,
  view_count integer,
  fork_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  owner_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.description,
    p.files,
    p.preview_image,
    p.view_count,
    p.fork_count,
    p.created_at,
    p.updated_at,
    up.full_name as owner_name
  FROM projects p
  JOIN user_profiles up ON p.user_id = up.id
  WHERE p.share_token = p_share_token AND p.is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_forks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: projects

-- Usuários podem ver seus próprios projetos
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Todos podem ver projetos públicos
CREATE POLICY "Anyone can view public projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Usuários podem criar projetos
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar próprios projetos
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuários podem deletar próprios projetos
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins podem ver todos os projetos
CREATE POLICY "Admins can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: project_deployments

-- Usuários podem ver seus próprios deployments
CREATE POLICY "Users can view own deployments"
  ON project_deployments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuários podem criar deployments de seus projetos
CREATE POLICY "Users can create deployments"
  ON project_deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- Admins podem ver todos os deployments
CREATE POLICY "Admins can view all deployments"
  ON project_deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: project_forks

-- Usuários podem ver forks que criaram
CREATE POLICY "Users can view own forks"
  ON project_forks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuários podem ver forks de seus projetos
CREATE POLICY "Users can view forks of their projects"
  ON project_forks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = original_project_id AND user_id = auth.uid()
    )
  );

-- Todos podem ver forks de projetos públicos
CREATE POLICY "Anyone can view forks of public projects"
  ON project_forks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = original_project_id AND is_public = true
    )
  );
