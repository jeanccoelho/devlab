# Guia de Execução Local - Bolt.new

## Pré-requisitos
- Node.js 18+ instalado
- pnpm instalado (`npm install -g pnpm`)
- Git configurado

## Passos para Executar

### 1. Clonar e Atualizar o Repositório
```bash
git pull
```

### 2. Limpar Cache e Reinstalar Dependências
```bash
# Limpar caches antigos
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
rm -rf build

# Instalar dependências
pnpm install
```

### 3. Verificar Tipos TypeScript
```bash
pnpm tsc
```

### 4. Executar Build
```bash
pnpm build
```

### 5. Iniciar Servidor de Desenvolvimento
```bash
pnpm dev
```

O servidor estará disponível em: `http://localhost:5173`

## Solução de Problemas

### Erro de Tipos TypeScript
Se você encontrar erros de tipo relacionados ao Supabase, execute:

```bash
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
pnpm install
pnpm tsc
```

**Nota Técnica**: Os tipos do Supabase utilizam double type assertions (`as unknown as Database['public']['Tables'][...]`) combinadas com `@ts-ignore` para garantir compatibilidade em diferentes ambientes TypeScript. Isso é necessário porque:
- Alguns ambientes locais têm inferência de tipos mais restritiva
- Os genéricos do Supabase podem não ser reconhecidos corretamente em todas as versões do TypeScript
- A diretiva `@ts-ignore` permite que o código compile em ambientes problemáticos sem afetar ambientes que funcionam corretamente

### Erro de Porta em Uso
Se a porta 5173 estiver ocupada, você pode:
1. Parar o processo que está usando a porta
2. Ou modificar a porta no `vite.config.ts`

### Erro de Variáveis de Ambiente
Certifique-se de que o arquivo `.env` existe e contém:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

## Comandos Úteis

```bash
# Verificar tipos sem compilar
pnpm typecheck

# Executar build de produção
pnpm build

# Executar testes (quando disponíveis)
pnpm test

# Limpar tudo e reinstalar
rm -rf node_modules build .cache && pnpm install
```

## Estrutura de Pastas Principal

```
bolt.new/
├── app/                    # Código fonte da aplicação
│   ├── components/        # Componentes React
│   ├── contexts/          # Contextos React (Auth, etc)
│   ├── lib/              # Bibliotecas e utilitários
│   ├── routes/           # Rotas Remix
│   ├── styles/           # Estilos SCSS
│   └── types/            # Definições TypeScript
├── supabase/             # Migrações do banco de dados
│   └── migrations/       # Arquivos SQL de migração
├── public/               # Arquivos estáticos
└── build/                # Build de produção (gerado)
```

## Funcionalidades Implementadas

### Autenticação
- ✅ Login (`/login`)
- ✅ Cadastro (`/signup`)
- ✅ Recuperação de senha (`/forgot-password`)
- ✅ Redefinição de senha (`/reset-password`)

### Dashboard
- ✅ Dashboard principal (`/dashboard`)
- ✅ Perfil do usuário (`/dashboard/profile`)
- ✅ Gerenciamento de tokens (`/dashboard/tokens`)

### Sistema de Monetização
- ✅ Sistema de tokens integrado
- ✅ Consumo automático no chat
- ✅ Histórico de uso
- ✅ Transações

### Painel Administrativo
- ✅ Acesso restrito (`/admin`)
- ✅ Gerenciamento de usuários
- ✅ Controle de tokens
- ✅ Log de ações administrativas

## Suporte

Para problemas ou dúvidas, consulte:
- README.md principal
- SETUP_GUIDE.md para configuração inicial
- Documentação do Remix: https://remix.run/docs
- Documentação do Supabase: https://supabase.com/docs
