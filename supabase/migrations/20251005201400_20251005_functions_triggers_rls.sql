-- Funções, Triggers e RLS para o sistema base

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

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
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
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_forks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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
CREATE POLICY "Users can view active packages"
  ON token_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON token_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: token_usage
CREATE POLICY "Users can view own usage"
  ON token_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage records"
  ON token_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

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
CREATE POLICY "Admins can manage logs"
  ON admin_actions_log FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

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
CREATE POLICY "Users can view own deployments"
  ON project_deployments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deployments"
  ON project_deployments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

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
CREATE POLICY "Users can view own forks"
  ON project_forks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Inserir pacotes de tokens padrão
INSERT INTO token_packages (name, token_amount, price, description, is_active)
VALUES
  ('Inicial', 100, 9.90, 'Pacote inicial perfeito para começar', true),
  ('Básico', 500, 39.90, 'Para uso regular da plataforma', true),
  ('Premium', 1500, 99.90, 'Para usuários frequentes', true),
  ('Profissional', 5000, 299.90, 'Para uso profissional intensivo', true)
ON CONFLICT DO NOTHING;
