# Guia de Configuração - Bolt.new

## Configuração Inicial

### 1. Verificar Variáveis de Ambiente

Certifique-se de que o arquivo `.env` contém:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_key_aqui
ANTHROPIC_API_KEY=sua_api_key_anthropic
```

### 2. Aplicar Migrações do Banco de Dados

O projeto possui duas migrações importantes que precisam ser aplicadas:

1. **Sistema de Autenticação e Monetização**
   - Localização: `supabase/migrations/20251003214709_create_auth_and_monetization_schema.sql`
   - Cria: user_profiles, token_packages, transactions, token_usage, admin_actions_log

2. **Sistema de Projetos e Compartilhamento**
   - Localização: `supabase/migrations/20251004000000_create_projects_and_sharing.sql`
   - Cria: projects, project_deployments, project_forks

**Para aplicar as migrações:**

Se você estiver usando Supabase localmente:
```bash
supabase db reset
```

Se estiver usando Supabase cloud:
1. Acesse o Dashboard do Supabase
2. Vá em "SQL Editor"
3. Execute o conteúdo de cada arquivo de migração na ordem

### 3. Criar Primeiro Usuário

Você tem 3 opções para criar um usuário:

#### Opção A: Via Interface de Signup
1. Acesse `http://localhost:5173/signup`
2. Preencha os dados:
   - Nome completo
   - Email
   - Senha (mínimo 6 caracteres)
3. Clique em "Criar Conta"
4. Você receberá 50 tokens grátis automaticamente

#### Opção B: Via Supabase Dashboard
1. Acesse o Dashboard do Supabase
2. Vá em "Authentication" → "Users"
3. Clique em "Add user" → "Create new user"
4. Preencha email e senha
5. O perfil será criado automaticamente com o trigger

#### Opção C: Via SQL (Desenvolvimento)
Execute no SQL Editor do Supabase:

```sql
-- Inserir usuário de teste (ajuste o email/senha)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
)
VALUES (
  gen_random_uuid(),
  'teste@exemplo.com',
  crypt('senha123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Usuário Teste"}'::jsonb,
  '{}'::jsonb
);
```

### 4. Criar um Usuário Admin (Opcional)

Para ter acesso ao painel administrativo:

```sql
-- Encontre o ID do seu usuário
SELECT id, email FROM auth.users;

-- Atualize o role para admin
UPDATE user_profiles
SET role = 'admin'
WHERE id = 'SEU_USER_ID_AQUI';
```

### 5. Comprar Tokens (Opcional)

Se você ficar sem tokens:

1. Acesse `/dashboard/tokens`
2. Escolha um pacote:
   - Inicial: 100 tokens - R$ 9,90
   - Básico: 500 tokens - R$ 39,90
   - Premium: 1.500 tokens - R$ 99,90
   - Profissional: 5.000 tokens - R$ 299,90
3. **Nota:** O gateway de pagamento ainda não está integrado. Para adicionar tokens manualmente:

```sql
-- Adicionar tokens manualmente para teste
UPDATE user_profiles
SET
  token_balance = token_balance + 500,
  total_tokens_purchased = total_tokens_purchased + 500
WHERE id = 'SEU_USER_ID_AQUI';
```

## Testando as Funcionalidades

### Chat AI
1. Faça login em `/login`
2. Acesse `/` (página inicial)
3. Digite um prompt no chat
4. O sistema irá:
   - Verificar seu saldo de tokens
   - Processar a requisição com Claude
   - Deduzir tokens automaticamente

### Export de Projeto
1. Crie um projeto no chat
2. Clique em "Export" no workbench
3. Um arquivo ZIP será baixado

### Compartilhamento
1. Clique em "Share" no workbench
2. O projeto será salvo como público
3. Copie o link gerado
4. Qualquer pessoa pode acessar via `/share/TOKEN`

### Deploy
1. Clique em "Deploy" no workbench
2. Escolha a plataforma (Netlify/Vercel/Cloudflare)
3. Será redirecionado para a plataforma

## Estrutura de Tokens

- **Custo por requisição:** ~1 token por 1000 tokens usados pelo modelo
- **Saldo inicial:** 50 tokens grátis no signup
- **Saldo baixo:** Alerta quando < 10 tokens
- **Sem saldo:** Chat bloqueado até comprar mais

## Troubleshooting

### Erro 401 Unauthorized
**Problema:** Usuário não autenticado

**Solução:**
1. Verifique se você criou um usuário
2. Faça login em `/login`
3. Verifique se as variáveis de ambiente do Supabase estão corretas

### Erro: Missing Supabase environment variables
**Problema:** Variáveis de ambiente não configuradas

**Solução:**
1. Copie `.env.example` para `.env` (se existir)
2. Adicione suas credenciais do Supabase
3. Reinicie o servidor de desenvolvimento

### Tabelas não existem
**Problema:** Migrações não aplicadas

**Solução:**
1. Execute as migrações na ordem correta
2. Verifique no Supabase Dashboard se as tabelas foram criadas

### Sem tokens para usar o chat
**Problema:** Saldo de tokens zerado

**Solução:**
1. Adicione tokens manualmente via SQL (desenvolvimento)
2. Ou integre um gateway de pagamento (produção)

## Próximos Passos

Para preparar o projeto para produção:

1. **Integrar Gateway de Pagamento**
   - Stripe, Mercado Pago ou similar
   - Implementar webhooks
   - Processar confirmações de pagamento

2. **Configurar Notificações por Email**
   - Resend, SendGrid ou similar
   - Email de boas-vindas
   - Confirmação de compras
   - Alertas de saldo baixo

3. **Adicionar Segurança**
   - Rate limiting
   - CAPTCHA no signup
   - Monitoring com Sentry
   - Backup automático do banco

4. **Deploy em Produção**
   - Cloudflare Pages (já configurado)
   - Configure variáveis de ambiente na plataforma
   - Configure domínio customizado

## Suporte

Para mais informações:
- Supabase Docs: https://supabase.com/docs
- Remix Docs: https://remix.run/docs
- Anthropic Claude: https://docs.anthropic.com/
