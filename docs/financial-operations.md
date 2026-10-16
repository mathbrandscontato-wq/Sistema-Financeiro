# Financeiro • etapa 4

Controle operacional de contratações, sinais previstos e recebimentos confirmados manualmente. Não emite instrumento jurídico, cobrança bancária ou confirmação automática de Pix.

## Fluxo

1. Fechar a oportunidade no CRM.
2. Registrar a contratação e as condições acordadas. O valor contratual pode diferir da proposta por aditivo; o orçamento e a proposta original permanecem preservados.
3. Conferir e registrar recebimentos reais, com data, tipo e confirmação. Sinal previsto e vencimentos não criam receita.
4. Quando o histórico anterior for desconhecido, conferir extratos e todos os recebimentos antes de confirmar que está completo. Adicionar um pagamento não elimina essa incerteza.
5. Conferir pagamentos antigos do orçamento vinculado: associar a um recebimento equivalente já existente ou registrar como adicional. Só o recebimento financeiro entra neste módulo; o vínculo mantém as duas evidências sem repetir a receita.
6. Para corrigir um recebimento, estornar seu registro com justificativa e adicionar o correto. O registro original, sua data e sua evidência permanecem disponíveis.

## Regras e persistência

- Valores monetários em centavos inteiros, entrada com Decimal e arredondamento HALF_UP; valores vazios não viram zero automaticamente.
- Valor contratado positivo; sinal previsto opcional e limitado ao contrato; recebimento positivo e limitado ao saldo conhecido. Quitação deve corresponder ao saldo de referência.
- Datas reais de contratação e recebimento não podem ser futuras. Datas ausentes na planilha não são inferidas da data de referência; recebimentos sem data ficam fora de filtros por período.
- Estados comerciais, cobrança enviada, atividade do contrato e confirmação do histórico de pagamentos são independentes.
- Cancelamento exige histórico conferido e ausência de recebimentos ativos. Cancelar não apaga contrato, histórico ou orçamento.
- `commercial_contracts`: revisão, cobrança enviada, ativo/cancelado, sinal previsto, vencimentos, condições e atualização. Colunas antigas continuam válidas.
- `commercial_payments`: tipo e estorno lógico; valor, data, confirmação e evidência originais não são sobrescritos.
- `financial_history`: eventos imutáveis com entrada da operação, justificativa e valores anteriores/posteriores.
- `financial_quote_receipts`: vínculo único por pagamento de orçamento e por recebimento financeiro, com cópia da evidência original. Nunca altera os dados do orçamento.
- Migração 0004 é aditiva, sem recriar tabelas existentes, recalcular valores ou inventar datas.
- Todas as APIs exigem identidade autenticada e filtram pelo proprietário. Revisão do contrato serializa alterações; transações D1 evitam pagamentos concorrentes acima do saldo e alterações parciais.
- IDs de operação determinísticos e eventos imutáveis tornam reenvios idempotentes; reutilizar um ID com outro conteúdo é recusado.
- Orçamentos vinculados a contratos direcionam novos recebimentos, estornos e cancelamentos ao Financeiro. Os recebimentos antigos do orçamento são preservados como origem para conferência.
- Backup antes de cada mutação; snapshots versão de modelo 4 e exportação JSON incluem todas as novas tabelas.

## Indicadores desta etapa

Na tela Financeiro, contratado e saldos representam a posição atual dos contratos filtrados. Recebido pode ser filtrado pela data real do pagamento. O saldo com histórico confirmado aparece separado do saldo de referência com pagamentos anteriores desconhecidos. Recebimentos sem data são identificados explicitamente.

A etapa 5 consolida oportunidades, propostas, contratos e recebimentos no Dashboard Comercial, descrito em `dashboard-operations.md`. A lista de orçamentos conserva seu escopo documental. Vínculos explícitos e conferências impedem somar novamente fontes do mesmo recebimento.

## Verificação

`pnpm test:finance`: execução dos planos reais em SQLite, migração sobre dados existentes, valores, datas, estados desconhecidos, pagamentos parciais, quitação, estorno, permissões, concorrência, repetição de solicitações e conferência sem receita duplicada. `pnpm test:protection`: baseline visual dos PDFs, texto selecionável, Pix completo, Inter incorporada e hashes do template/ativos. Os testes de CRM e importação continuam obrigatórios no build.

Não foi realizada validação em navegador nesta etapa: o recurso de controle de navegador exigido pelo ambiente não estava disponível. A navegação, responsividade e confirmação dos formulários devem ser conferidas na versão publicada pelo proprietário antes da validação final de uso.
