/*
  # Sistema Multi-Modelo de IA
  
  Sistema completo para suporte a múltiplos provedores de IA com:
  - Seleção automática baseada em tarefas
  - Fallback inteligente em caso de falha
  - Cache de respostas para economia
  - Rastreamento detalhado de custos e performance
  - Preferências personalizáveis por usuário
*/

-- Tabela: ai_providers
CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  api_key_required boolean NOT NULL DEFAULT true,
  cost_per_1k_input_tokens decimal(10, 6) NOT NULL DEFAULT 0,
  cost_per_1k_output_tokens decimal(10, 6) NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela: ai_models
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  max_tokens integer NOT NULL DEFAULT 4096,
  context_window integer NOT NULL DEFAULT 8192,
  capabilities jsonb DEFAULT '[]',
  cost_multiplier decimal(4, 2) NOT NULL DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_id, model_id)
);

-- Tabela: ai_response_cache
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash text NOT NULL UNIQUE,
  prompt text NOT NULL,
  response text NOT NULL,
  model_id uuid NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  tokens_used integer NOT NULL DEFAULT 0,
  hit_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Tabela: ai_usage_logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost decimal(10, 6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  was_cached boolean NOT NULL DEFAULT false,
  fallback_used boolean NOT NULL DEFAULT false,
  task_type text DEFAULT '',
  success boolean NOT NULL DEFAULT true,
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Tabela: user_ai_preferences
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  preferred_provider text DEFAULT '',
  preferred_model_id uuid REFERENCES ai_models(id) ON DELETE SET NULL,
  enable_auto_selection boolean NOT NULL DEFAULT true,
  enable_cache boolean NOT NULL DEFAULT true,
  max_cost_per_request decimal(10, 6) DEFAULT 0.50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_name ON ai_providers(name);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_prompt_hash ON ai_response_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires_at ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model_id ON ai_usage_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user_id ON user_ai_preferences(user_id);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_ai_providers_updated_at ON ai_providers;
CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_models_updated_at ON ai_models;
CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_ai_preferences_updated_at ON user_ai_preferences;
CREATE TRIGGER update_user_ai_preferences_updated_at
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função: buscar resposta em cache
CREATE OR REPLACE FUNCTION get_cached_response(p_prompt_hash text)
RETURNS TABLE (
  response text,
  model_id uuid,
  tokens_used integer
) AS $$
BEGIN
  UPDATE ai_response_cache
  SET 
    hit_count = hit_count + 1,
    last_used_at = now()
  WHERE 
    prompt_hash = p_prompt_hash AND
    expires_at > now();

  RETURN QUERY
  SELECT 
    c.response,
    c.model_id,
    c.tokens_used
  FROM ai_response_cache c
  WHERE 
    c.prompt_hash = p_prompt_hash AND
    c.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: salvar resposta em cache
CREATE OR REPLACE FUNCTION save_cached_response(
  p_prompt_hash text,
  p_prompt text,
  p_response text,
  p_model_id uuid,
  p_tokens_used integer,
  p_cache_duration_hours integer DEFAULT 24
)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_response_cache (
    prompt_hash,
    prompt,
    response,
    model_id,
    tokens_used,
    expires_at
  ) VALUES (
    p_prompt_hash,
    p_prompt,
    p_response,
    p_model_id,
    p_tokens_used,
    now() + (p_cache_duration_hours || ' hours')::interval
  )
  ON CONFLICT (prompt_hash) DO UPDATE SET
    response = EXCLUDED.response,
    tokens_used = EXCLUDED.tokens_used,
    expires_at = EXCLUDED.expires_at,
    last_used_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: selecionar melhor modelo para tarefa
CREATE OR REPLACE FUNCTION select_best_model_for_task(
  p_task_type text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_model_id uuid;
  v_preferred_model_id uuid;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT preferred_model_id INTO v_preferred_model_id
    FROM user_ai_preferences
    WHERE user_id = p_user_id AND enable_auto_selection = false;
    
    IF v_preferred_model_id IS NOT NULL THEN
      RETURN v_preferred_model_id;
    END IF;
  END IF;

  SELECT m.id INTO v_model_id
  FROM ai_models m
  JOIN ai_providers p ON m.provider_id = p.id
  WHERE 
    m.is_active = true AND
    p.is_active = true AND
    (m.capabilities @> to_jsonb(ARRAY[p_task_type]) OR m.capabilities @> '["all"]'::jsonb)
  ORDER BY p.priority DESC, m.cost_multiplier ASC
  LIMIT 1;

  IF v_model_id IS NULL THEN
    SELECT m.id INTO v_model_id
    FROM ai_models m
    JOIN ai_providers p ON m.provider_id = p.id
    WHERE m.is_active = true AND p.is_active = true
    ORDER BY p.priority DESC
    LIMIT 1;
  END IF;

  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: registrar uso de IA
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id uuid,
  p_model_id uuid,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_cost decimal,
  p_latency_ms integer,
  p_was_cached boolean DEFAULT false,
  p_fallback_used boolean DEFAULT false,
  p_task_type text DEFAULT '',
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT ''
)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_usage_logs (
    user_id,
    model_id,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    cost,
    latency_ms,
    was_cached,
    fallback_used,
    task_type,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_model_id,
    p_prompt_tokens,
    p_completion_tokens,
    p_prompt_tokens + p_completion_tokens,
    p_cost,
    p_latency_ms,
    p_was_cached,
    p_fallback_used,
    p_task_type,
    p_success,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: ai_providers
CREATE POLICY "Everyone can view active providers"
  ON ai_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage providers"
  ON ai_providers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: ai_models
CREATE POLICY "Everyone can view active models"
  ON ai_models FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage models"
  ON ai_models FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: ai_response_cache
CREATE POLICY "Everyone can read cache"
  ON ai_response_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage cache"
  ON ai_response_cache FOR ALL
  TO authenticated
  USING (true);

-- Políticas RLS: ai_usage_logs
CREATE POLICY "Users can view own logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert logs"
  ON ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS: user_ai_preferences
CREATE POLICY "Users can view own preferences"
  ON user_ai_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences"
  ON user_ai_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inserir provedores padrão
INSERT INTO ai_providers (name, display_name, cost_per_1k_input_tokens, cost_per_1k_output_tokens, priority, is_active)
VALUES
  ('anthropic', 'Anthropic (Claude)', 0.003, 0.015, 100, true),
  ('openai', 'OpenAI (GPT)', 0.0015, 0.002, 90, true),
  ('google', 'Google (Gemini)', 0.000125, 0.000375, 80, true),
  ('mistral', 'Mistral AI', 0.001, 0.003, 70, true)
ON CONFLICT (name) DO NOTHING;

-- Inserir modelos padrão
INSERT INTO ai_models (provider_id, model_id, display_name, description, max_tokens, context_window, capabilities, cost_multiplier, is_active)
SELECT 
  p.id,
  'claude-3-5-sonnet-20240620',
  'Claude 3.5 Sonnet',
  'Modelo mais avançado da Anthropic, excelente para código e raciocínio complexo',
  8192,
  200000,
  '["code_generation", "debugging", "analysis", "chat", "refactoring"]'::jsonb,
  1.0,
  true
FROM ai_providers p WHERE p.name = 'anthropic'
ON CONFLICT DO NOTHING;

INSERT INTO ai_models (provider_id, model_id, display_name, description, max_tokens, context_window, capabilities, cost_multiplier, is_active)
SELECT 
  p.id,
  'gpt-4-turbo',
  'GPT-4 Turbo',
  'Modelo rápido e poderoso da OpenAI com grande contexto',
  4096,
  128000,
  '["code_generation", "debugging", "analysis", "chat"]'::jsonb,
  1.2,
  true
FROM ai_providers p WHERE p.name = 'openai'
ON CONFLICT DO NOTHING;

INSERT INTO ai_models (provider_id, model_id, display_name, description, max_tokens, context_window, capabilities, cost_multiplier, is_active)
SELECT 
  p.id,
  'gemini-1.5-pro',
  'Gemini 1.5 Pro',
  'Modelo avançado do Google com excelente custo-benefício',
  8192,
  1000000,
  '["code_generation", "analysis", "chat"]'::jsonb,
  0.8,
  true
FROM ai_providers p WHERE p.name = 'google'
ON CONFLICT DO NOTHING;

INSERT INTO ai_models (provider_id, model_id, display_name, description, max_tokens, context_window, capabilities, cost_multiplier, is_active)
SELECT 
  p.id,
  'mistral-large-latest',
  'Mistral Large',
  'Modelo de código aberto poderoso e eficiente',
  8192,
  32000,
  '["code_generation", "chat"]'::jsonb,
  0.9,
  true
FROM ai_providers p WHERE p.name = 'mistral'
ON CONFLICT DO NOTHING;
