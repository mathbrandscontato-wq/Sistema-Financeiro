# Proteção documental e recuperação · etapa 1

## Estado de referência

Fonte: versão 2 publicada, commit e642465bb5cc0de725a414893ae8dc3ac28096d7. As três tabelas originais estavam vazias na auditoria. Não houve importação do histórico comercial nesta etapa.

A referência de proteção é a saída da implementação publicada, com o Pix Nubank já aplicado. Ela não afirma igualdade absoluta de pixels com o antigo PDF, cuja área bancária é diferente. A proposta visual existente não foi redesenhada.

## Template imutável

`lib/templates/v1/document.mjs` e `core.mjs` conservam o motor e as regras documentais atuais. Novas versões devem ser acrescentadas em outro diretório, com seus próprios assets quando houver mudanças. Os documentos existentes sem versão explícita usam `mathbrands-v1`. O campo é preservado pelo servidor e não pode ser alterado pelo editor.

`qa/protection/baseline` contém hashes dos assets/motor, hashes das posições e renderizações PNG de três casos. O teste compara todos os pixels, paginação, fontes e o Pix completo como texto. O registro inicial foi realizado antes da mudança de estrutura. Não recapturar a referência para fazer um teste passar. Uma mudança visual exige revisão e uma nova versão de template.

## Arquivos emitidos

O botão Baixar PDF primeiro arquiva o arquivo em R2 e registra seu SHA-256, revisão, template e snapshot dos dados em D1. Exportar novamente a mesma revisão recupera o arquivo original. Alterar o orçamento e emitir uma revisão nova preserva a emissão anterior. Downloads verificam autenticidade de acesso e integridade do conteúdo. A proteção é de integridade/arquivamento; não é uma assinatura digital nem validação bancária.

## Backups

Antes de create/import/save/settings/payment/reverse/delete, a aplicação cria uma cópia dos dados do usuário em R2. A cópia contém documentos ativos e excluídos, configurações, eventos e metadados dos PDFs. Os SELECTs são executados em um batch do D1 para leitura consistente. Se a cópia não puder ser criada, a operação não continua. Cópias não são apagadas automaticamente.

Configurações exibe as últimas 30 cópias; arquivos anteriores continuam armazenados. O backup JSON versão 2 preserva os dados brutos e IDs. PDFs binários são recuperados separadamente pelo histórico de emissões; não estão embutidos no JSON.

A importação antiga de rascunhos aceita somente JSON versão 1. Ela NÃO restaura backups de proteção, não preserva IDs/pagamentos e pode duplicar orçamentos. Não usar para recuperar a plataforma. A planilha de CRM será tratada na etapa 2 com identidade e idempotência próprias.

## Procedimento de recuperação

1. Identificar a cópia correta por data e operação, e baixar o JSON e os PDFs relevantes antes de mudanças.
2. Verificar SHA-256 com o valor mostrado nos metadados/cabeçalho de download. Conferir site de origem, versão 2, contagem, IDs, saldos, recebimentos e registros excluídos.
3. Comparar a cópia com o estado atual e preparar um relatório das diferenças. Obter autorização específica para substituir dados. Não executar recuperação como parte de uma importação comum.
4. Restaurar em uma cópia isolada do banco. Se houver mudança de usuário/Site, mapear explicitamente a identidade autenticada. Não confiar em IDs do arquivo para conceder acesso.
5. Validar referências, saldo, numeração e auditoria. Tratar IDs em conflito com outro usuário como erro; não renumerar silenciosamente. O próximo ID deve ser maior que os IDs históricos.
6. Fazer outra cópia do estado atual e só depois aplicar as alterações revisadas em transação. Preservar o histórico de recuperação e os PDFs arquivados; não apagar a trilha de auditoria atual.
7. Executar os testes documentais e conferir os totais. Registrar a recuperação como evento próprio.

Não há restauração destrutiva com um clique nesta etapa. A recuperação é um procedimento técnico revisado para não apagar pagamentos ou trabalho mais recente por engano.

## Migrações e reversão

A migração nova apenas acrescenta `document_exports` e `protection_snapshots`. Não altera, renumera, remove ou reescreve os registros das tabelas originais. Os snapshots/migrations anteriores ficam intactos. A etapa 2 acrescenta também as oito tabelas comerciais descritas em `commercial-foundation.md`, e o backup completo passa a incluir `commercialRecords`.

Para reverter uma falha, recuperar o código anterior mantendo as tabelas novas e os objetos R2. Preservar os bindings DB e BUCKET durante a reversão. Não fazer DROP TABLE, não apagar arquivos e não reescrever uma migração aplicada. Uma limpeza futura exige uma nova migração e backup revisado.

## Validação

`node qa/protection/check.mjs` requer Poppler (`pdftoppm`, `pdffonts`, `pdftotext`), Python/Pillow e os pacotes já instalados. `python3 qa/protection/database.py` verifica schema aditivo, preservação da primeira emissão e isolamento. O build executa esses testes antes de compilar e bloqueia alterações visuais inesperadas. Tipagem: `pnpm exec tsc --noEmit`.

Limite desta execução: sem validação de navegação/mobile em navegador. Os testes de armazenamento locais verificam as regras de banco; não substituem um teste autenticado ponta a ponta de upload/download no Site publicado.

## Evolução financeira (etapa 4)

Os snapshots `dataModelVersion: 4` também incluem `financial_history` e `financial_quote_receipts`, além das colunas financeiras aditivas de contratos e recebimentos. Na recuperação, restaurar contratos e pagamentos antes de seus eventos e vínculos de conferência; conservar os orçamentos e revisar a unicidade de cada vínculo para impedir receita duplicada. Estornos são lógicos e não devem ser descartados durante a restauração. As três versões de PDF de referência continuam sendo comparadas integralmente, sem recaptura da baseline.

Snapshots `dataModelVersion: 5` incluem as tabelas do diagnóstico público e metadados das oportunidades. Restaurar `intake_forms` antes de `intake_sessions`; clientes e oportunidades antes de `intake_contact_keys`, `intake_lead_links` e `intake_captures`. Conferir a unicidade das chaves de contato, captura por sessão e oportunidade por contato/versão. Sessões expiradas não devem voltar a aceitar captura. Os segredos de acesso do gateway são configurações de runtime, não parte do backup ou do código. Revalidar o proprietário configurado e o acesso privado do painel após uma recuperação.


## Evolução versão 6

Aquisição, responsáveis, permissões de equipe, contato visível com Instagram/site e preparação da API financeira são descritos em `acquisition-team-and-payment-api.md`. O backup completo agora usa `dataModelVersion: 6`. O editor genérico de questionários permanece fora desta entrega.

## Atendimento comercial — versão 8

O snapshot versão 8 mantém os campos anteriores e acrescenta `prospectingRecords`, com configuração, consentimentos, conversas, inbox/outbox, handoffs, aprovações, custos, relatórios e cota da conta do proprietário. As consultas e a cota são isoladas por proprietário/conta; segredos do ambiente ficam fora do JSON. Preservar opt-outs e recibos durante restauração e conciliar eventos posteriores para evitar reenvios ou autorizações ressuscitadas. A reversão preferencial mantém migrações aditivas. Ver [preparação de produção e rollback](commercial-production-readiness.md).

## Ensaio isolado de restauração v8 — 24/10/2026

`qa/prospecting/restore-drill.mjs` valida, usando somente SQLite em memória e identidades fictícias, a estrutura do snapshot v8, SHA-256 do JSON, restauração para banco vazio, integridade referencial, isolamento por proprietário, contratos/pagamentos/histórico, consentimento revogado, opt-out, pausa humana, outbox incerta sem reenvio e ledger individual. O teste recusa payload alterado, não acessa D1/R2 reais e foi incorporado à suíte `test:commercial-runtime`. Na primeira execução CI após integração, o run [40138552856](https://github.com/mathbrandscontato-wq/Sistema-Financeiro/actions/runs/40138552856), commit `0d99b967`, passou com `pnpm build`, TypeScript e regressões.

**Limite crítico do escopo de proteção:** o snapshot gerado por `createProtectionSnapshot(owner,...)` contém somente registros daquele proprietário. Já `prospecting_costs` tem cotas **globais da conta compartilhada de fornecedores**; outros proprietários não estão na cópia individual. Uma restauração exclusiva do snapshot poderia subcontar uso gratuito, sem que o teste unitário detectasse a perda por completo. Os PDFs em R2 também não estão embutidos nesse JSON. Portanto, backup por proprietário não é equivalente a backup integral/recuperação de desastre.

Antes de qualquer recuperação de produção: obter backup integral consistente de D1, todos os objetos R2 e seus metadados, criar inventário de referências e hashes, preservar o ledger de **todos** os proprietários, testar restauração em infraestrutura separada e validar as permissões. Enquanto a conciliação global não for comprovada, manter `killSwitch:true` e todos os provedores externos desligados. Não restaurar diretamente o JSON de um único proprietário sobre o D1 em uso, não sobrescrever registros posteriores, não reiniciar cota e não apagar recibos, opt-outs ou estornos. Nenhum backup/restore remoto foi executado nesta etapa.
