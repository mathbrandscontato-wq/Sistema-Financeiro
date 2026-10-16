# Dashboard Comercial integrado • etapa 5

Painel de consulta da operação comercial e financeira. Nenhum dado é importado novamente, editado, conciliado ou confirmado pelo Dashboard. A fonte é o banco existente do proprietário autenticado; a planilha inicial permanece preservada pelo mecanismo de importação idempotente.

## Consolidação

- Uma oportunidade e seu orçamento representam um único negócio somente por `commercial_quote_links`. Nomes parecidos nunca criam vínculos automáticos.
- No negócio vinculado, a etapa atual do CRM governa os resultados comerciais. Fechado = aprovado, Recusado = recusado; Proposta enviada, Aguardando resposta e Acompanhamento = pendente. Novo lead e Contato inicial ficam em contato. O estado do orçamento permanece intacto; divergências entre CRM e documento geram aviso.
- O valor proposto vem do CRM. Se ausente, utiliza o valor explícito do orçamento vinculado ou da contratação; se todas as fontes estiverem vazias, mostra “A definir” e exclui das somas. Zero explícito e valor desconhecido são distintos.
- Orçamentos sem vínculo representam negócios separados. O painel pede a conferência dos vínculos quando houver registros sem associação. A atribuição de clientes do CRM a documentos sem vínculo não é presumida pelo nome.
- Contagem e total dos documentos emitidos são indicadores próprios, sem rascunhos. Negócios importados da planilha não geram documentos emitidos fictícios.
- Conversão = quantidade de negócios aprovados / quantidade de propostas aprovadas, recusadas e pendentes. Rascunhos e leads em contato ficam fora; denominador vazio retorna ausência de propostas, não zero por cento.
- Contratação, recebimento e aprovação comercial continuam independentes. Uma etapa comercial recusada não cancela contrato nem estorna recebimentos automaticamente.

## Dinheiro

- Recebimentos do Financeiro vêm de `commercial_payments`, sem estornos lógicos.
- Pagamentos de orçamentos sem contratação financeira são contabilizados como confirmação manual de orçamento.
- Quando existe contratação vinculada, os pagamentos antigos do orçamento só entram após conferência no Financeiro: o Dashboard usa exclusivamente o registro financeiro. `financial_quote_receipts` conserva a ligação e evidência, sem somar novamente a origem. Um estorno do registro financeiro não reativa a cópia do orçamento.
- Recebimentos vinculados a contrato que ainda aguardam conferência aparecem fora do recebido consolidado. O painel mostra sua quantidade e valor e permite abrir a contratação correta.
- Saldos contratuais incluem somente contratos ativos. Contratos com histórico anterior desconhecido têm saldo de referência separado do saldo a receber conferido, mesmo quando seu saldo aritmético for zero.
- Aprovações sem contratação não criam contas a receber contratuais. Sua quantidade e seus valores definidos são exibidos separadamente.
- Valores são calculados em centavos inteiros; validação impede somas fora da precisão inteira segura. Orçamentos usam as mesmas regras decimais existentes.

## Datas e filtros

Cliente, busca e status comercial se aplicam ao negócio e a seus contratos/recebimentos relacionados. Arquivamento conserva o histórico e os saldos; os registros arquivados continuam identificados no painel.

O período comercial considera emissão do orçamento. Sem documento, considera a referência explícita do histórico ou a data de cadastro no CRM em America/Sao_Paulo, informando a origem no detalhamento. O resultado mostra o status atual das propostas do período; não reconstrói a etapa passada numa determinada data.

Recebido considera a data real do pagamento, independentemente da data comercial do negócio. Contratos e saldos são a posição atual, não um balanço histórico do período. Pagamentos sem data entram no total sem filtro de período, mas não são alocados artificialmente a um mês. O gráfico apresenta apenas os seis meses até o fim do período, com pagamentos efetivamente datados.

As próximas ações mostram a agenda atual dos negócios abertos filtrados, com destaque para atraso. Não inventa datas para ações importadas que só têm descrição.

## Arquitetura e operação

- `lib/dashboard.mjs`: regra única de consolidação, filtros e cálculos, reutilizável em exportações e API futura.
- `GET /api/dashboard`: identidade exigida, queries owner-scoped e leitura consistente das tabelas em um batch D1. O endpoint não aceita mutações e não tem integração bancária.
- `app/dashboard-workspace.tsx`: painel responsivo, filtros, comparação de origens, exportação JSON da visão e atalhos para o registro exato no CRM/Financeiro ou editor do orçamento.
- Atualiza ao entrar no painel, trocar filtros, retornar à aba e acionar Atualizar. Solicitações antigas são canceladas para não substituir filtros mais recentes.
- A exportação contém indicadores, regras, filtros e registros de origem resumidos, com data/hora. Não serve como restauração de backup.
- Sem migração do banco nesta etapa. Nenhuma alteração ao Pix, ativos ou template do PDF.

## Verificação

`pnpm test:dashboard` importa o histórico original em SQLite, executa planos financeiros reais e valida totais, conversão, períodos independentes, clientes/status, vínculos, ausência de datas, valores desconhecidos/zero, arquivamento, cancelamento, estorno e isolamento por proprietário. Valida que os indicadores não modificam as fontes. Todos os testes de proteção PDF, importação, CRM e Financeiro continuam obrigatórios no build.

A verificação em navegador permanece pendente: o recurso de controle de navegador exigido pelo ambiente não está disponível. Tipo, build e lógica de persistência/cálculo são verificados automaticamente; responsividade e interação devem ser conferidas na versão publicada antes da validação final de uso.
