# Base comercial e importação · etapa 2

## Escopo entregue

A migração acrescenta oito tabelas: clientes, oportunidades, contratações, recebimentos, histórico, lotes de importação, linhas de origem e vínculos com orçamentos. Não transforma leads em orçamentos, não cria datas de emissão ou números fictícios, não altera o conteúdo das propostas e não importa sinais para dentro do JSON dos orçamentos existentes.

A tela Histórico comercial permite consultar e filtrar os registros, abrir sua origem, baixar a base em JSON e vincular manualmente uma oportunidade a um orçamento existente. A edição completa de clientes/negociações, o fluxo de contratos/parcelas e o dashboard consolidado pertencem às próximas etapas.

## Origem e conciliação

A fonte é o arquivo Dashboard Comercial _ Math Brands.xlsx fornecido pelo usuário, com referência em 09/10/2026. Seu SHA-256 original e o conteúdo extraído estão em `data/commercial-reference.json`, usado apenas no servidor. A aba Leads é a origem dos registros. Dashboard é uma representação repetida desses dados; Próximas ações fica preservada na origem, sem substituir o próximo passo da aba principal. Há uma ação secundária antiga de confirmar o sinal da Lavander, apesar de o sinal já estar confirmado na aba Leads.

Conciliação independente: cinco oportunidades, três contratações confirmadas na planilha, R$ 950,00 contratado, dois sinais somando R$ 225,00 e R$ 500,00 em oportunidades sem fechamento. O saldo de referência das contratações é R$ 725,00. R$ 500,00 desse saldo pertence ao Ricardo, cujo pagamento está não informado; essa parte depende de confirmação. Não é possível afirmar que não houve pagamento apenas porque a célula de sinal está zerada.

A data de referência não é uma data de pagamento. O sinal da Lavander não tem data explícita na origem e mantém `paid_on = NULL`. A consultoria cita 09/10/2026 no registro de recebimento. Não há data de assinatura/fechamento comprovada: `confirmed_on` fica NULL em todas as contratações. E-mail e telefone ausentes permanecem NULL.

## Identidade e repetição

As identidades são determinísticas por usuário, tipo e chave de origem. A referência inicial recebe chaves externas estáveis que não dependem do nome do arquivo ou da posição da linha. Cada linha conserva o texto, coordenadas, referência temporal e hash da fonte. Unicidade por proprietário e chave externa impede duplicação. O lote é único por usuário, namespace e hash do arquivo. Nomes normalizados servem ao cadastro inicial de clientes; homônimos e mudanças de identidade exigirão conciliação no CRM completo, sem substituição automática.

O código compara os registros existentes. Repetir a mesma fonte recupera o lote já confirmado e não regrava dados, pagamentos ou próximos passos. Uma fonte alterada ou oportunidade compatível preexistente gera conflito. Qualquer conflito bloqueia o lote todo. O plano de SQL é executado em `D1.batch()` como uma transação. Uma disputa com o mesmo lote reconsulta o lote confirmado; erros sem lote confirmado continuam visíveis.

A importação autorizada roda na primeira abertura autenticada da plataforma depois da publicação, porque a identidade do proprietário é fornecida pela sessão. Nenhuma identidade é inventada durante deploy. A tela possui Conferir importação para repetir a conferência sem duplicação. A publicação não prova que a importação já rodou na sessão do usuário.

## Vínculos e indicadores

O vínculo é explícito, proprietário e um para um nesta etapa. Um mesmo orçamento não pode ser ligado a duas oportunidades, nem uma oportunidade a dois orçamentos. Não é feita correspondência por semelhança de nomes. O vínculo não copia valores nem confirma recebimentos. A proposta e suas emissões conservam a numeração, revisão e template.

Os totais da tela Histórico comercial são calculados somente sobre sua base normalizada. O dashboard de orçamentos continua com seu escopo atual. A etapa de consolidação deverá utilizar os vínculos para evitar somar duas vezes o mesmo negócio e distinguir pagamentos presentes nas duas origens. Não somar mecanicamente os dois painéis.

## Segurança e recuperação

Todas as operações exigem a sessão ChatGPT e filtram o proprietário em cada consulta. Os endpoints aceitam apenas importar a referência e vincular um orçamento; não aceitam nome de tabela nem proprietário do cliente. Não há integração externa nova, confirmação bancária ou emissão/assinatura automática de contrato.

Antes da importação e do vínculo manual, é guardado um backup. Os backups completos agora incluem `commercialRecords` e `dataModelVersion: 2`, com todas as oito tabelas, fonte e metadados dos lotes. Arquivos de propostas continuam arquivados separadamente. O procedimento de recuperação da etapa 1 deve restaurar clientes antes de oportunidades, contratos antes de recebimentos e conferir todas as referências e proprietários em banco isolado. Nunca usar a antiga importação de rascunhos como restauração.

A migração é aditiva. Para reverter, restaurar o código anterior mantendo DB, BUCKET e as tabelas novas. Não apagar registros nem reescrever migrações aplicadas.

## Verificação

`pnpm test:commercial` executa o plano de importação real em SQLite com chaves estrangeiras ativadas e verifica totais, identidade, repetição, disputa de transações, conflitos, preservação de edições posteriores, dados ausentes, isolamento entre usuários e vínculo sem alteração dos dados do orçamento. O build executa esse teste e os testes de preservação de PDFs. `pnpm exec tsc --noEmit` valida a tipagem.

Limite: sem ferramenta de QA em navegador nesta execução. A importação em D1/R2 usando a sessão real e a navegação no celular precisam de conferência após abrir a aplicação. Testes locais e publicação não substituem essa verificação.

A etapa 3 evolui esta base para o CRM operacional descrito em `crm-operations.md`. A importação e os valores de referência continuam preservados.
