# Análise Técnica — Sistema Financeiro Nova Tratores
> Gerado em: 2026-03-05 | Base de código: commit a50

---

## RESUMO EXECUTIVO

O sistema está funcional e bem estruturado para o uso atual. As principais oportunidades de melhoria estão em três frentes:
1. **Duplicação de código** — as mesmas funções e componentes são escritos de novo em cada página
2. **Bugs silenciosos** — lógicas que falham sem erro visível (inconsistência de strings, loops de realtime)
3. **Experiência do usuário** — `alert()` em todo lugar, sem feedback de carregamento nas ações

---

## 1. DUPLICACAO DE CODIGO (prioridade alta)

### Funções copiadas em cada página

As funções abaixo existem **identicamente** em 4-6 arquivos diferentes. Qualquer correção precisa ser feita em cada um manualmente.

| Função | Onde está duplicada |
|---|---|
| `formatarDataBR()` | kanban, kanban-financeiro, home-posvendas, historico-pagar, historico-receber, historico-rh |
| `formatarMoeda()` | home-financeiro, kanban-financeiro, home-posvendas, kanban |
| `calcTempo()` | kanban-financeiro, MenuLateral (como `calcTempoHistorico`) |
| `LoadingScreen` | todos os 10+ arquivos de página |
| `GeometricBackground` | kanban, kanban-financeiro, home-posvendas, home-financeiro |
| `handleLogout()` | todos os arquivos de página |
| Auth check pattern | todos os arquivos de página |
| `AttachmentTag` | kanban, home-posvendas, home-financeiro (3 implementações diferentes) |

**Solução:** Criar um arquivo `src/lib/utils.js` com as funções compartilhadas e um arquivo `src/components/shared.js` com os componentes reutilizáveis.

```js
// src/lib/utils.js (sugerido)
export const formatarDataBR = (dataStr) => { ... }
export const formatarMoeda = (valor) => { ... }
export const calcTempo = (dateStr) => { ... }
```

```js
// src/components/shared.js (sugerido)
export function LoadingScreen({ titulo, subtitulo, tema = 'dark' }) { ... }
export function GeometricBackground({ tema = 'dark' }) { ... }
export function AttachmentTag({ label, fileUrl, onUpload, disabled }) { ... }
```

### Hook de autenticação

O mesmo bloco de código aparece em todos os `useEffect` de init:

```js
// Repetido em todos os arquivos de página
const { data: { session } } = await supabase.auth.getSession()
if (!session) return router.push('/login')
const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
setUserProfile(prof)
```

**Solução:** Criar um hook `src/hooks/useAuth.js`:

```js
// src/hooks/useAuth.js (sugerido)
export function useAuth() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
        .then(({ data }) => { setUserProfile(data); setLoading(false) })
    })
  }, [router])

  return { userProfile, loading }
}
```

---

## 2. INCONSISTENCIAS DE DADOS (prioridade alta)

### Strings de forma_pagamento divergem entre páginas

O sistema usa strings literais para comparar a forma de pagamento, mas há variações de caixa entre páginas:

| String no código | Onde |
|---|---|
| `'Boleto 30 dias'` (d minúsculo) | kanban/page.js, home-posvendas |
| `'Boleto 30 Dias'` (D maiúsculo) | kanban-financeiro, auto-move logic |
| `'Á Vista no Pix'` | kanban-financeiro, home-financeiro |
| `'Cartão a Vista'` | kanban/page.js |
| `'Cartão a vista'` | novo-chamado-nf |

Isso causa falhas silenciosas: um boleto cadastrado como `'Boleto 30 dias'` não vai acionar o auto-move no kanban-financeiro que espera `'Boleto 30 Dias'`.

**Solução:** Centralizar em constantes:

```js
// src/lib/constants.js (sugerido)
export const FORMAS_PAGAMENTO = {
  BOLETO_30: 'Boleto 30 Dias',
  BOLETO_PARCELADO: 'Boleto Parcelado',
  PIX: 'Á Vista no Pix',
  CARTAO_VISTA: 'Cartão a Vista',
  CARTAO_PARCELADO: 'Cartão Parcelado',
}

export const STATUS_CHAMADO = {
  GERAR_BOLETO: 'gerar_boleto',
  ENVIAR_CLIENTE: 'enviar_cliente',
  AGUARDANDO: 'aguardando_vencimento',
  PAGO: 'pago',
  VENCIDO: 'vencido',
  CONCLUIDO: 'concluido',
}
```

### datas_parcelas armazenado como CSV

O campo `datas_parcelas` é uma string do tipo `"2026-04-01, 2026-05-01, 2026-06-01"`. O parsing usa `.split(/[\s,]+/)` que quebra com espaços duplos ou vírgulas extras.

**Solução:** Mudar a coluna para `JSONB` no Supabase (`["2026-04-01", "2026-05-01"]`) e atualizar o código de leitura/escrita. Mais seguro e elimina o parsing manual.

### requisicoes_json em coluna TEXT

O campo `requisicoes_json` é um `text` que armazena JSON. Supabase tem suporte nativo a `jsonb` que valida, indexa e permite queries dentro do JSON.

**Solução:** Alterar a coluna `requisicoes_json` para tipo `jsonb DEFAULT '[]'::jsonb` no Supabase.

---

## 3. BUGS E LOGICAS PROBLEMATICAS (prioridade alta)

### Loop potencial no realtime

**Onde:** kanban-financeiro e kanban (pos-vendas)

**Problema:** O fluxo é:
1. Realtime detecta UPDATE em `Chamado_NF`
2. Chama `carregarDados()`
3. `carregarDados` faz auto-moves (UPDATE no banco)
4. O UPDATE do passo 3 dispara o realtime novamente → volta ao passo 1

Isso pode criar 2-3 ciclos extras a cada atualização.

**Solução:** Antes do auto-move, checar se o status já está correto:
```js
const paraAutoPago = (data || []).filter(c =>
  c.status === 'aguardando_vencimento' && // só move se ainda não está certo
  c.forma_pagamento === 'Boleto 30 Dias' &&
  c.vencimento_boleto && new Date(c.vencimento_boleto + 'T00:00:00') < hoje
);
// Já está correto — nenhum UPDATE desnecessário é feito
```

Isso já está parcialmente resolvido, mas a reconexão do realtime ainda pode disparar múltiplos `carregarDados`. Adicionar um `ref` de debounce:

```js
const recarregandoRef = useRef(false)
const carregarDados = async () => {
  if (recarregandoRef.current) return
  recarregandoRef.current = true
  try { /* ... */ } finally {
    setTimeout(() => { recarregandoRef.current = false }, 1000)
  }
}
```

### checkVencidos no MenuLateral usa colunas antigas

**Arquivo:** `src/components/MenuLateral.js` linha ~110

```js
// ATUAL — usa status_p1..p6 que são colunas legadas
const { data } = await supabase.from('Chamado_NF').select('status, status_p1, status_p2, ..., status_p6');
data?.forEach(c => {
  if (c.status === 'vencido') totalVencidos++;
  for(let i=1; i<=6; i++) { if (c[`status_p${i}`] === 'vencido') totalVencidos++; }
});
```

O sistema migrou para `comprovante_pagamento_p1..p5` e `parcelas_info`, mas o contador de vencidos ainda usa as colunas antigas `status_p1..p6`. O número no badge do menu pode estar incorreto.

**Solução:**
```js
// CORRIGIDO — contar apenas pelo status principal
const { data } = await supabase.from('Chamado_NF').select('id, status').eq('status', 'vencido')
setAlertasVencidos(data?.length || 0)
```

### Chat duplicado na página de Configurações

**Arquivo:** `src/app/configuracoes/page.js`

Existe um `ChatFlutuante` reimplementado do zero nessa página, completamente separado do chat do `MenuLateral`. Diferenças problemáticas:
- Não tem deduplicação de mensagens otimistas
- Recarrega **todas** as mensagens a cada INSERT (não só adiciona a nova)
- Não tem fotos de usuário
- Não salva no histórico de notificações

**Solução:** Remover o `ChatFlutuante` da página de configurações e usar o chat do `MenuLateral` que já é global.

### NotificationSystem ainda ouve finan_receber

**Arquivo:** `src/components/NotificationSystem.js` linha ~243

O sistema de notificações ainda tem um listener para INSERT em `finan_receber`, mas essa tabela foi removida do fluxo principal. Qualquer inserção antiga ou residual gera uma notificação "NOVO RECEBIMENTO" que leva a um card que não existe em nenhuma tela.

**Solução:** Remover o listener de `finan_receber` do NotificationSystem, ou mantê-lo apenas se `finan_receber` ainda for usado para algum relatório.

### setTimeout artificial no novo-chamado-nf

**Arquivo:** `src/app/novo-chamado-nf/page.js` linha ~57

```js
setTimeout(() => setPageLoading(false), 600) // delay artificial
```

Isso adiciona 600ms de loading sem motivo. O `setPageLoading(false)` deve ser chamado diretamente após os dados estarem prontos.

---

## 4. EXPERIENCIA DO USUARIO (prioridade média)

### alert() em todo o sistema

O sistema usa `alert()` do navegador para confirmar ações e erros. São ao menos 20+ ocorrências. Isso:
- Bloqueia a thread
- Tem visual feio e inconsistente com o design do sistema
- Não desaparece automaticamente

O sistema já tem um mecanismo de toast no `NotificationSystem`. A ideia é usar o mesmo padrão para mensagens de sucesso/erro nas ações dos cards.

**Solução sugerida:** Criar um hook/contexto global de toast que qualquer componente pode usar:

```js
// src/hooks/useToast.js (sugerido)
export function useToast() {
  const show = (msg, tipo = 'sucesso') => {
    window.dispatchEvent(new CustomEvent('app_toast', { detail: { msg, tipo } }))
  }
  return { show }
}
```

### window.confirm() para ações destrutivas

Ainda há alguns usos de `window.confirm()` para confirmar recobrança e outras ações. Visual inconsistente com o restante do sistema.

**Solução:** Criar um componente de modal de confirmação reutilizável com os estilos do sistema.

### Sem feedback de loading nas ações dos cards

Ao clicar "Concluir", "Mover para Vencido", "Pedido de Recobrança", o botão não muda de estado. O usuário não sabe se a ação foi processada até o alert aparecer.

**Solução:** Adicionar estado `processando` local nos handlers:
```js
const [processando, setProcessando] = useState(false)
const handleConcluir = async (t) => {
  setProcessando(true)
  try { /* ... */ } finally { setProcessando(false) }
}
```

---

## 5. PERFORMANCE (prioridade média)

### select('*') em todas as queries

Todas as queries buscam todas as colunas de todas as tabelas. `Chamado_NF` tem ~25 campos, muitos são arquivos (URLs longas) que não são necessários na listagem.

**Impacto:** Maior payload, mais dados processados no cliente.

**Solução para listagem:** Selecionar apenas campos necessários:
```js
// Para a listagem no kanban, não precisamos das URLs de arquivo
supabase.from('Chamado_NF').select('id, nom_cliente, status, forma_pagamento, valor_servico, vencimento_boleto, qtd_parcelas, datas_parcelas, comprovante_pagamento, comprovante_pagamento_p1, comprovante_pagamento_p2, comprovante_pagamento_p3, tarefa, recombrancas_qtd, created_at')
```

### Históricos sem paginação

`historico-pagar`, `historico-receber`, `historico-rh` carregam todos os registros de uma vez. Com o tempo isso vai crescer e a página vai travar.

**Solução:** Adicionar paginação ou scroll infinito com `.range(0, 49)` no Supabase.

### Sem debounce nos filtros

Os filtros de texto (filtroCliente, filtroNF) re-renderizam a lista a cada tecla. Para listas grandes isso causa lag.

**Solução:** Usar `useMemo` para a lista filtrada ou `useDeferredValue` do React.

---

## 6. ESTRUTURA DO BANCO DE DADOS (prioridade média)

### Colunas que deveriam existir (a confirmar no Supabase)

| Coluna | Tabela | Tipo sugerido | Motivo |
|---|---|---|---|
| `status_changed_at` | `Chamado_NF` | `timestamptz` | Rastrear quando o status mudou. Código já tenta salvar mas pode falhar silenciosamente |
| `is_requisicao` | `finan_pagar` | `boolean DEFAULT false` | Já usado no código |
| `requisicoes_json` | `finan_pagar` | `jsonb DEFAULT '[]'` | Já usado no código. Deve ser jsonb, não text |
| `data_vencimento` | `finan_pagar` | `date` | Usado no modal mas pode não existir |
| `numero_NF` | `finan_pagar` | `text` | Usado no modal e no form de criação |

### Row Level Security (RLS)

O sistema usa a chave `ANON` do Supabase publicamente. Se o RLS não estiver configurado no Supabase, qualquer pessoa com a chave pode ler/escrever em qualquer tabela.

**Verificar:** No painel do Supabase, confirmar que todas as tabelas têm RLS ativado com políticas que exigem autenticação (`auth.uid() IS NOT NULL`).

---

## 7. FUNCIONALIDADES FALTANDO (sugestões futuras)

### Dashboard com KPIs
A home não tem nenhum número resumido. Sugestão:
- Total em aberto (boletos + pagar)
- Boletos vencidos hoje
- Valor total previsto para o mês
- Gráfico de faturamento mensal (pode usar Recharts que é leve)

### Exportação de dados
Nenhuma tela tem exportação. Para o financeiro isso é essencial.
- Botão "Exportar CSV" nos históricos
- Botão "Exportar PDF" no modal do card (relatório do processo)

### Filtros nas homes
`home-financeiro` e `home-posvendas` não têm campo de busca. Com muitos registros a tela fica difícil de usar.

### Notificação de vencimento antecipado
O sistema detecta `parcelaProxima` (vence em 3 dias) mas não notifica. Poderia enviar uma push notification automática quando um boleto está para vencer.

### Histórico de ações por card
Cada card não tem log de quem fez o quê e quando. Uma tabela simples `auditoria_chamado` com `(chamado_id, usuario_nome, acao, data)` tornaria o sistema muito mais rastreável.

### Controle de permissões por função
Hoje `userProfile.funcao` é lido mas não há restrições reais de interface. Um usuário do Pós-Vendas poderia acessar `/home-financeiro` diretamente pela URL. Adicionar um check de função nas páginas sensíveis.

---

## 8. MELHORIAS RAPIDAS (fáceis de implementar)

| Item | Arquivo | Impacto | Complexidade |
|---|---|---|---|
| Remover `setTimeout` artificial | novo-chamado-nf/page.js | Baixo | Trivial |
| Corrigir `checkVencidos` para não usar `status_p1..p6` | MenuLateral.js | Médio | Baixo |
| Remover listener `finan_receber` do NotificationSystem | NotificationSystem.js | Baixo | Trivial |
| Padronizar strings de `forma_pagamento` | todos | Alto | Baixo |
| Adicionar debounce no realtime de `carregarDados` | kanban, kanban-financeiro | Médio | Baixo |
| Remover `ChatFlutuante` duplicado de configuracoes | configuracoes/page.js | Médio | Baixo |
| Corrigir "Contas a Receber" no menu lateral | MenuLateral.js | Baixo | Trivial |
| Substituir `R$ {valor}` sem formatação nas notificações | NotificationSystem.js | Baixo | Trivial |

---

## ORDEM DE PRIORIDADE SUGERIDA

```
AGORA (sem risco, alto impacto):
  1. Padronizar strings de forma_pagamento (constantes)
  2. Corrigir checkVencidos no MenuLateral
  3. Remover listener finan_receber do NotificationSystem
  4. Remover setTimeout artificial do novo-chamado-nf
  5. Adicionar debounce no carregarDados

PRÓXIMO SPRINT:
  6. Criar src/lib/utils.js com funções compartilhadas
  7. Criar hook useAuth para eliminar duplicação
  8. AttachmentTag unificado em shared.js
  9. Remover ChatFlutuante de configuracoes
  10. Paginação nos históricos

FUTURO (features novas):
  11. Dashboard com KPIs e totais
  12. Exportação CSV/PDF
  13. Filtros nas homes
  14. Log de auditoria por card
  15. Migrar datas_parcelas para JSON
```

---

*Última atualização: 2026-03-05*
