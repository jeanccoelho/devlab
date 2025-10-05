-- Aplicar todas as migrações base de uma vez

-- Criação dos tipos ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

-- Tabela: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'user',
  token_balance integer NOT NULL DEFAULT 0,
  total_tokens_purchased integer NOT NULL DEFAULT 0,
  total_tokens_consumed integer NOT NULL DEFAULT 0,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela: token_packages
CREATE TABLE IF NOT EXISTS token_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token_amount integer NOT NULL CHECK (token_amount > 0),
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES token_packages(id) ON DELETE SET NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  token_amount integer NOT NULL CHECK (token_amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT '',
  payment_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela: token_usage
CREATE TABLE IF NOT EXISTS token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tokens_consumed integer NOT NULL CHECK (tokens_consumed > 0),
  chat_id text DEFAULT '',
  model_used text DEFAULT '',
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela: admin_actions_log
CREATE TABLE IF NOT EXISTS admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

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

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
