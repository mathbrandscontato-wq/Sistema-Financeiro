# CRM operacional · etapa 3

## Fluxo

O menu CRM abre oportunidades em lista ou funil. As etapas são Novo lead, Contato inicial, Proposta enviada, Aguardando resposta, Acompanhamento, Fechado e Recusado. As etapas existentes da planilha foram mantidas. As oportunidades podem ser buscadas por nome, cliente e próxima ação, filtradas por cliente, etapa, arquivamento e ações com data.

Clientes têm nome de cadastro, contato principal, segmento, origem, e-mail, telefone e observações. Cada cliente pode ter múltiplas oportunidades. O sistema bloqueia cadastros com a mesma identidade normalizada, incluindo os arquivados, para direcionar ao cadastro existente em vez de duplicar. O nome de cadastro distingue empresas/pessoas; homônimos exigem uma identificação diferente, sem fusão automática. E-mail compartilhado entre contatos não é uma chave universal de cliente.

Uma oportunidade possui cliente, título, valor proposto opcional, etapa comercial, etapa do projeto, briefing, próxima ação, data opcional e observações. Um valor em branco é NULL; zero informado é zero. Dinheiro é convertido com Decimal e arredondamento HALF_UP para centavos. A tela informa oportunidades sem valor ao lado da soma dos valores conhecidos.

No funil, o seletor do cartão muda a etapa com gravação no servidor. O detalhe registra as negociações por canal (Nota, WhatsApp, E-mail, Ligação, Reunião ou Instagram), texto e data opcional. Datas de negociação/ação nunca são inferidas da data de importação. A data de gravação é preservada separadamente. Notas são acrescentadas ao histórico; correções devem ser registradas como uma nova nota.

## Orçamentos e financeiro

O CRM permite iniciar um orçamento com empresa, contato, e-mail e telefone já cadastrados. Um contato ausente continua em branco, para preenchimento no gerador antes de salvar. Serviços e condições continuam sendo revisados no editor. O orçamento permanece um documento independente; o vínculo com uma oportunidade é explícito após salvar. Editar um cliente não reescreve propostas ou PDFs emitidos.

Fechado representa apenas a decisão comercial. A alteração de etapa não gera contratação financeira, assinatura, cobrança, recebimento nem confirmação de Pix. As contratações e sinais importados permanecem intactos. Quando uma oportunidade já tem contratação registrada, o CRM não permite alterar seu valor ou trocar seu cliente. Esses ajustes pertencem à etapa Financeiro, que ainda será desenvolvida. Mudanças de etapa comercial conservam a contratação existente e sua trilha de origem.

O dashboard consolidado continua para a etapa posterior. O funil informa somente valores propostos em negociação, sem somá-los à receita recebida.

## Edição, concorrência e arquivo

Clientes e oportunidades recebem `revision = 1` inicialmente. Cada alteração usa a revisão lida, o ID e o proprietário. O UPDATE condicional e seu evento são feitos em uma transação D1.batch. Uma alteração concorrente faz o UPDATE e o evento afetarem zero linhas; a API responde 409, sem fabricar eventos. O CRM recarrega a base ao detectar o conflito e preserva o formulário digitado. Fechar e reabrir o editor permite conferir a revisão atual.

Criar clientes/oportunidades e registrar notas usam um identificador de operação estável durante tentativas de envio. A API compara o conteúdo da solicitação com o evento original antes de reconhecer uma repetição. Uma solicitação repetida com conteúdo diferente gera conflito. A transação cancela uma operação concorrente se o cliente tiver sido arquivado durante o envio.

Arquivar é uma operação lógica, confirmada na interface. Nada é removido fisicamente. Os dados, fontes, pagamentos e documentos permanecem disponíveis. Clientes com oportunidades ativas não podem ser arquivados. Para reativar uma oportunidade, seu cliente deve estar ativo. Os filtros mostram registros ativos, arquivados ou ambos. Alterações não salvas têm aviso antes de sair do formulário ou da plataforma.

## Dados e recuperação

A migração 0003 acrescenta revisão, arquivamento, contato/observações e data de próxima ação, além da tabela `commercial_client_history`. Não altera dados do template, tabelas de pagamentos ou registros de importação. As tabelas e campos anteriores permanecem intactos.

`COMMERCIAL_TABLES` é compartilhado pela leitura da base e pelas cópias de proteção. Backups com `dataModelVersion: 3` incluem também o histórico dos clientes. Todas as mutações exigem identidade ChatGPT, filtram o proprietário e criam proteção antes de escrever. Os eventos registram mudanças e revisões; não são confirmações bancárias nem um log externo inviolável.

Para reverter, recuperar o código anterior mantendo DB, BUCKET, novas colunas e tabelas. Não remover migrações aplicadas, fontes ou arquivos. A recuperação revisada segue o procedimento documental da etapa 1, validando referências em banco isolado.

## Verificação e limites

`pnpm test:crm` executa os planos de gravação em SQLite com chaves estrangeiras: cadastro/edição, valores em branco e zero, centavos, validação de contatos e datas, conflitos de revisão, cancelamento de alterações concorrentes, notas, arquivamento/restauração e preservação dos sinais/fonte. O build executa os testes de CRM, importação e PDFs. A tipagem é verificada com `pnpm exec tsc --noEmit`.

Não houve QA de navegação no navegador ou de transações autenticadas contra o banco publicado. A publicação confirma a implantação; testes de navegação, celular e sessão real ainda precisam de conferência. Nenhuma integração externa nova foi implementada.
