/*
  # Sistema de Autenticação e Monetização

  ## 1. Novas Tabelas
  
  ### `user_profiles`
  - `id` (uuid, primary key, referencia auth.users)
  - `full_name` (text) - Nome completo do usuário
  - `role` (text) - Role do usuário (user, admin)
  - `token_balance` (integer) - Saldo atual de tokens
  - `total_tokens_purchased` (integer) - Total de tokens comprados
  - `total_tokens_consumed` (integer) - Total de tokens consumidos
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### `token_packages`
  - `id` (uuid, primary key)
  - `name` (text) - Nome do pacote (ex: "Básico", "Premium")
  - `token_amount` (integer) - Quantidade de tokens no pacote
  - `price` (decimal) - Preço em reais
  - `description` (text) - Descrição do pacote
  - `is_active` (boolean) - Se o pacote está ativo para venda
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `transactions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, referencia user_profiles)
  - `package_id` (uuid, referencia token_packages)
  - `amount` (decimal) - Valor pago
  - `token_amount` (integer) - Quantidade de tokens comprados
  - `status` (text) - Status da transação (pending, completed, failed, refunded)
  - `payment_method` (text) - Método de pagamento usado
  - `payment_id` (text) - ID da transação no gateway de pagamento
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `token_usage`
  - `id` (uuid, primary key)
  - `user_id` (uuid, referencia user_profiles)
  - `tokens_consumed` (integer) - Quantidade de tokens consumidos
  - `chat_id` (text) - ID do chat/conversa
  - `model_used` (text) - Modelo de IA usado
  - `prompt_tokens` (integer) - Tokens usados no prompt
  - `completion_tokens` (integer) - Tokens usados na resposta
  - `created_at` (timestamptz)

  ### `admin_actions_log`
  - `id` (uuid, primary key)
  - `admin_id` (uuid, referencia user_profiles)
  - `action_type` (text) - Tipo de ação (user_update, role_change, package_update, etc)
  - `target_user_id` (uuid, nullable) - ID do usuário afetado
  - `description` (text) - Descrição da ação
  - `metadata` (jsonb) - Dados adicionais da ação
  - `created_at` (timestamptz)

  ## 2. Segurança
  - Habilitar RLS em todas as tabelas
  - Políticas para usuários visualizarem apenas seus próprios dados
  - Políticas para admins terem acesso completo
  - Políticas para usuários comprarem tokens
  - Políticas para registro de uso de tokens

  ## 3. Funções e Triggers
  - Função para deduzir tokens do saldo após uso
  - Função para adicionar tokens após compra confirmada
  - Trigger para atualizar updated_at automaticamente
  - Função para calcular estatísticas de uso
*/

-- Criar enum para roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum para status de transações
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
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

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_id ON admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_created_at ON admin_actions_log(created_at DESC);

-- Função: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_token_packages_updated_at ON token_packages;
CREATE TRIGGER update_token_packages_updated_at
  BEFORE UPDATE ON token_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função: criar perfil de usuário automaticamente após signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role, token_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Função: processar compra de tokens
CREATE OR REPLACE FUNCTION process_token_purchase(
  p_transaction_id uuid
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_token_amount integer;
BEGIN
  SELECT user_id, token_amount 
  INTO v_user_id, v_token_amount
  FROM transactions
  WHERE id = p_transaction_id AND status = 'completed';

  IF FOUND THEN
    UPDATE user_profiles
    SET 
      token_balance = token_balance + v_token_amount,
      total_tokens_purchased = total_tokens_purchased + v_token_amount
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: consumir tokens
CREATE OR REPLACE FUNCTION consume_tokens(
  p_user_id uuid,
  p_tokens integer,
  p_chat_id text DEFAULT '',
  p_model_used text DEFAULT '',
  p_prompt_tokens integer DEFAULT 0,
  p_completion_tokens integer DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  v_current_balance integer;
BEGIN
  SELECT token_balance INTO v_current_balance
  FROM user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance >= p_tokens THEN
    UPDATE user_profiles
    SET 
      token_balance = token_balance - p_tokens,
      total_tokens_consumed = total_tokens_consumed + p_tokens
    WHERE id = p_user_id;

    INSERT INTO token_usage (
      user_id,
      tokens_consumed,
      chat_id,
      model_used,
      prompt_tokens,
      completion_tokens
    ) VALUES (
      p_user_id,
      p_tokens,
      p_chat_id,
      p_model_used,
      p_prompt_tokens,
      p_completion_tokens
    );

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: user_profiles

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Usuários podem atualizar seu próprio perfil (exceto role e tokens)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    token_balance = (SELECT token_balance FROM user_profiles WHERE id = auth.uid())
  );

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar qualquer perfil
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: token_packages

-- Todos usuários autenticados podem ver pacotes ativos
CREATE POLICY "Users can view active packages"
  ON token_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins podem ver todos os pacotes
CREATE POLICY "Admins can view all packages"
  ON token_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem criar pacotes
CREATE POLICY "Admins can create packages"
  ON token_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar pacotes
CREATE POLICY "Admins can update packages"
  ON token_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: transactions

-- Usuários podem ver suas próprias transações
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuários podem criar transações para si mesmos
CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins podem ver todas as transações
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar transações
CREATE POLICY "Admins can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: token_usage

-- Usuários podem ver seu próprio histórico de uso
CREATE POLICY "Users can view own usage"
  ON token_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sistema pode inserir registros de uso
CREATE POLICY "System can insert usage records"
  ON token_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins podem ver todo o histórico de uso
CREATE POLICY "Admins can view all usage"
  ON token_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: admin_actions_log

-- Admins podem visualizar todos os logs
CREATE POLICY "Admins can view all logs"
  ON admin_actions_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem criar logs
CREATE POLICY "Admins can create logs"
  ON admin_actions_log FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir pacotes de tokens padrão
INSERT INTO token_packages (name, token_amount, price, description, is_active)
VALUES
  ('Inicial', 100, 9.90, 'Pacote inicial perfeito para começar', true),
  ('Básico', 500, 39.90, 'Para uso regular da plataforma', true),
  ('Premium', 1500, 99.90, 'Para usuários frequentes', true),
  ('Profissional', 5000, 299.90, 'Para uso profissional intensivo', true)
ON CONFLICT DO NOTHING;