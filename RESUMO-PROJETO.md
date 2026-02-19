# Sistema Financeiro - Resumo do Projeto

## Visão Geral

Sistema de gestão financeira e workflow interno construído com **Next.js 16 + Supabase**. Gerencia três domínios principais: **Faturamento (NF/Boletos)**, **Contas a Pagar/Receber** e **RH**, com acesso baseado em perfis (Financeiro, Pós-Vendas, Vendas, Diretoria).

---

## Tech Stack

| Camada         | Tecnologia                          |
|----------------|-------------------------------------|
| Framework      | Next.js 16.1.6 (App Router)        |
| UI             | React 19.2.3                        |
| Estilização    | Tailwind CSS 4 + CSS Variables      |
| Backend/Auth   | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Ícones         | Lucide React                        |
| Fonte          | Poppins (Google Fonts)              |
| Otimização     | React Compiler (babel plugin)       |

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── layout.js                   # Layout raiz (auth + tema)
│   ├── page.js                     # Redirecionamento por perfil
│   ├── globals.css                 # Estilos globais + variáveis CSS
│   ├── login/page.js               # Login/cadastro
│   ├── home-financeiro/page.js     # Dashboard financeiro
│   ├── home-posvendas/page.js      # Dashboard pós-vendas
│   ├── kanban/page.js              # Kanban boletos (pós-vendas)
│   ├── kanban-financeiro/page.js   # Kanban boletos (financeiro)
│   ├── novo-chamado-nf/page.js     # Novo chamado de NF
│   ├── novo-pagar-receber/page.js  # Nova conta pagar/receber
│   ├── novo-chamado-rh/page.js     # Novo chamado RH
│   ├── historico-pagar/page.js     # Histórico contas a pagar
│   ├── historico-receber/page.js   # Histórico contas a receber
│   ├── historico-rh/page.js        # Histórico RH
│   └── configuracoes/page.js       # Configurações do usuário
├── components/
│   ├── MenuLateral.js              # Sidebar ghost (navegação + chat global)
│   ├── NotificationSystem.js       # Notificações toast + bell
│   └── Chat.js                     # (vazio)
├── lib/
│   └── supabase.js                 # Cliente Supabase
```

---

## Rotas e Páginas

| Rota                    | Descrição                                      | Perfil        |
|-------------------------|-------------------------------------------------|---------------|
| `/`                     | Loader - redireciona por perfil do usuário      | Todos         |
| `/login`                | Autenticação (login + cadastro + avatar)        | Todos         |
| `/home-financeiro`      | Dashboard com cards de NF, pagar, receber, RH   | Financeiro    |
| `/home-posvendas`       | Dashboard com tarefas de envio de boletos        | Pós-Vendas    |
| `/kanban`               | Kanban de boletos (visão pós-vendas)             | Pós-Vendas    |
| `/kanban-financeiro`    | Kanban de boletos (visão financeiro)             | Financeiro    |
| `/novo-chamado-nf`      | Criar chamado de nota fiscal (serviço/peça)      | Financeiro    |
| `/novo-pagar-receber`   | Criar registro de pagar ou receber               | Financeiro    |
| `/novo-chamado-rh`      | Criar solicitação RH                             | Todos         |
| `/historico-pagar`      | Histórico de contas a pagar concluídas           | Financeiro    |
| `/historico-receber`    | Histórico de contas a receber concluídas         | Financeiro    |
| `/historico-rh`         | Histórico de solicitações RH concluídas          | Todos         |
| `/configuracoes`        | Perfil, tema (claro/escuro), som de notificação  | Todos         |

---

## Banco de Dados (Supabase/PostgreSQL)

### Tabelas

#### `financeiro_usu` — Usuários
| Campo            | Tipo   | Descrição                                    |
|------------------|--------|----------------------------------------------|
| id               | UUID   | PK (do auth)                                 |
| nome             | text   | Nome do usuário                              |
| funcao           | text   | "Financeiro", "Pós-Vendas", "Vendas", "Diretoria" |
| avatar_url       | text   | URL do avatar                                |
| tema             | text   | "claro" ou "escuro"                          |
| som_notificacao  | text   | Som selecionado                              |

#### `Chamado_NF` — Chamados de Nota Fiscal / Boletos
| Campo                | Tipo    | Descrição                                         |
|----------------------|---------|---------------------------------------------------|
| id                   | UUID    | PK                                                |
| nom_cliente          | text    | Nome do cliente                                   |
| valor_servico        | numeric | Valor total do serviço                            |
| forma_pagamento      | text    | "Boleto", "PIX", "Cartão"                        |
| num_nf_servico/peca  | text    | Números das notas fiscais                         |
| status               | text    | "gerar_boleto", "enviar_cliente", "aguardando_vencimento", "pago", "vencido", "concluido" |
| tarefa               | text    | Descrição da tarefa atual                         |
| setor                | text    | "Financeiro" ou "Pós-Vendas"                     |
| qtd_parcelas         | int     | 1 a 5                                             |
| vencimento_boleto    | date    | Data de vencimento                                |
| datas_parcelas       | text    | Datas separadas por vírgula                       |
| status_p1..p5        | text    | Status por parcela                                |
| tarefa_p1..p5        | text    | Tarefa por parcela                                |
| valor_parcela1..5    | numeric | Valor de cada parcela                             |
| anexo_*              | URL     | Anexos de NF, boleto, comprovante (por parcela)   |

#### `finan_pagar` — Contas a Pagar
| Campo            | Tipo    | Descrição               |
|------------------|---------|-------------------------|
| id               | UUID    | PK                      |
| fornecedor       | text    | Nome do fornecedor      |
| valor            | numeric | Valor                   |
| data_vencimento  | date    | Vencimento              |
| numero_NF        | text    | Número da NF            |
| motivo           | text    | Motivo                  |
| status           | text    | "financeiro", "pos_vendas", "concluido" |
| anexo_nf/boleto/requisicao | URL | Anexos           |

#### `finan_receber` — Contas a Receber
| Campo            | Tipo    | Descrição               |
|------------------|---------|-------------------------|
| id               | UUID    | PK                      |
| cliente          | text    | Nome do cliente         |
| valor            | numeric | Valor                   |
| data_vencimento  | date    | Vencimento              |
| tipo_nota        | text    | Tipo da nota            |
| motivo           | text    | Motivo                  |
| status           | text    | "financeiro", "pos_vendas", "concluido" |
| anexo_nf_servico/peca | URL | Anexos               |

#### `finan_rh` — Solicitações RH
| Campo       | Tipo | Descrição                                              |
|-------------|------|--------------------------------------------------------|
| id          | UUID | PK                                                     |
| funcionario | text | Nome do funcionário                                    |
| titulo      | text | Título da solicitação                                  |
| descricao   | text | Descrição                                              |
| setor       | text | "Administrativo", "Financeiro", "Vendas", "Pós-Vendas", "Oficina" |
| status      | text | "aberto", "pos_vendas", "concluido"                   |
| usuario_id  | UUID | Quem criou                                             |

#### `mensagens_chat` — Mensagens
| Campo          | Tipo      | Descrição                        |
|----------------|-----------|----------------------------------|
| id             | UUID      | PK                               |
| texto          | text      | Conteúdo da mensagem             |
| usuario_id     | UUID      | Autor                            |
| usuario_nome   | text      | Nome do autor                    |
| created_at     | timestamp | Data/hora                        |
| chamado_id     | UUID      | Ref p/ Chamado_NF (ou null)      |
| pagar_id       | UUID      | Ref p/ finan_pagar (ou null)     |
| receber_id     | UUID      | Ref p/ finan_receber (ou null)   |
| rh_id          | UUID      | Ref p/ finan_rh (ou null)        |
| midia_url      | URL       | Imagem/arquivo anexado           |
| visualizado_por| array     | IDs de quem visualizou           |

#### `Fornecedores` — Lista de Fornecedores
| Campo | Tipo | Descrição          |
|-------|------|--------------------|
| id    | UUID | PK                 |
| nome  | text | Nome do fornecedor |

### Storage Buckets
- `anexos` — Documentos (NFs, boletos, comprovantes)
- `avatars` — Fotos de perfil
- `chat-midia` — Arquivos/imagens do chat

---

## Componentes Principais

### MenuLateral.js
- Sidebar "ghost" (opacity 0.25 quando fechado, expande no hover)
- Exibe avatar, nome e perfil do usuário
- Navegação contextual por perfil
- Badge de itens vencidos
- Modal de chat global integrado
- Listener real-time para notificações

### NotificationSystem.js
- Ícone de sino com contador de não lidas (canto inferior direito)
- Dropdown com histórico de notificações
- Toast notifications com auto-dismiss (8s)
- Sons de alerta configuráveis (3 opções)
- Navegação por clique para o card relevante
- Subscrições real-time (mensagens + movimentações)

---

## Fluxos de Trabalho

### 1. Faturamento (NF/Boleto)
```
Criar chamado NF → Definir pagamento e parcelas → Upload de documentos
→ Financeiro: Gerar boleto → Enviar para Pós-Vendas
→ Pós-Vendas: Enviar boleto ao cliente → Marcar como enviado
→ Aguardar vencimento → Marcar como pago ou vencido → Concluído
```

### 2. Contas a Pagar/Receber
```
Criar registro → Anexar documentos → Acompanhar status
→ financeiro → pos_vendas → concluido → Vai para histórico
```

### 3. Solicitações RH
```
Criar solicitação → Atribuir setor → Acompanhar → Concluir
```

### 4. Comunicação
- Chat global (sidebar) — sem contexto de card
- Chat por card — contextual ao chamado/registro
- Notificações real-time com som

---

## Autenticação

- **Supabase Auth** com email/senha
- Cadastro cria usuário no auth + registro em `financeiro_usu`
- Upload de avatar durante cadastro
- Sessão persistente entre recarregamentos
- Redirecionamento automático para `/login` sem sessão
- Roteamento por perfil (`funcao`) após login

---

## Temas (Light/Dark)

Configurável em `/configuracoes`, salvo no perfil do usuário.

| Variável CSS          | Claro     | Escuro    |
|-----------------------|-----------|-----------|
| `--bg-pagina`         | #f0fdf4   | #0f172a   |
| `--texto-principal`   | #0f172a   | #f8fafc   |
| `--texto-secundario`  | #64748b   | #94a3b8   |

Aplicado via `data-theme` no `<html>`.

---

## Gerenciamento de Estado

- **Sem biblioteca externa** (sem Redux/Zustand/Jotai)
- `useState` — Estado local de UI e formulários
- `useEffect` — Fetch de dados e subscriptions real-time
- `useRef` — Referências DOM (scroll, file inputs)
- `useRouter` / `useSearchParams` — Navegação Next.js
- **Supabase Realtime** — Canais de subscrição para atualizações em tempo real

---

## Cores Customizadas (Tailwind)

| Nome            | Hex       | Uso                  |
|-----------------|-----------|----------------------|
| `nova-vermelho` | #B91C1C   | Alertas/destaques    |
| `nova-bege`     | #F5F5DC   | Fundos secundários   |

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://citrhumdkfivdzbmayde.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<JWT_TOKEN>
```

---

## Scripts (package.json)

```bash
npm run dev      # Desenvolvimento local
npm run build    # Build de produção
npm run start    # Iniciar produção
npm run lint     # Linting
```
