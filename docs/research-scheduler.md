# Pesquisa diária e contrato de agendamento

O módulo implementa a execução persistente da pesquisa e o ponto de integração do agendador. Nenhum serviço externo foi ativado ou contratado.

## Exports e integração

`buildResearchPlan({day,markets,maxQueries,priorities,contextualQueries})` mantém a biblioteca original de 15 mercados/90 consultas. O plano é determinístico para a mesma data/configuração. Distribui slots por maiores restos: 60% entre até três prioridades, 25% entre os demais mercados em rodízio e 15% para indicações/eventos com aprovação e evidência. Sem contexto elegível, esses slots ficam vazios; não há redistribuição para forçar volume. Prioridades iniciais são consultorias, fotografia e arquitetura/interiores, hipóteses a revisar pelo desempenho real.

`prioritizeExistingWork(items, now)` devolve interessados existentes e retornos combinados já vencidos antes da pesquisa nova. É uma fila de revisão/ação humana ou de atendimento elegível, sem envio de mensagens. Recusas e itens encerrados não entram.

`runDailyResearch({store,owner,token,markets,provider,config,clock,existingWork,contextualQueries,priorities})` usa o `ProspectingStore` existente e o mesmo D1. `clock` devolve ISO UTC e deve avançar com o relógio real no runtime. O provedor expõe `{mode:'mock'|'authorized',id,search(query,{signal,now,market})}`. O modo real exige `allowLiveResearch:true`, identificador, `maxQueries`, `maxCostMicros` e `costPerQueryMicros` explícitos. O custo por consulta é uma reserva conservadora na unidade definida pelo orçamento interno, não uma cotação atual do fornecedor. Se um candidato traz `persistenceAllowed:false`, seu conteúdo, nome, identificador e aliases não são gravados em empresa ou relatório; são incrementados somente os totais `restrictedResults`, `persistenceReview` e `markets[...].restricted`. O retorno restrito exige outro fundamento/fontes permitidas antes de formar um registro persistente.

`createSchedulerHandler({markets,providerFactory,loadConfig,loadExistingWork,loadContextualQueries,clock,newToken})` devolve um handler `(event, env)`, onde `env.DB` é D1 e `event.scheduledTime` é o horário programado em milissegundos UTC. `loadConfig` deve carregar proprietário e configuração confiáveis do servidor. `researchEnabled` começa desligado. O handler devolve apenas status/data/modo/quantidade e tarefas internas; o consumidor deve manter autenticação para detalhes da fila.

`scheduleDecision({now,scheduledAt,enabled})` aceita disparo às 10h30 ou atraso/retentativa na mesma data local de São Paulo. Bloqueia execução anterior às 10h30, eventos futuros e eventos de data local anterior. A pesquisa acontece inclusive em sábado, domingo e feriado; a política de mensagens proativas permanece separada.

## Persistência, orçamento e falhas

A tabela existente `prospecting_runs` guarda plano, consulta/custo reservado, estado complete/uncertain, totais e relatório por mercado em `report`. O checkpoint é salvo antes da chamada HTTP, dentro do lease/token atual. Quedas não zeram orçamento e consultas incertas não são repetidas automaticamente. A retomada pode processar consultas ainda não tentadas, respeitando teto acumulado; reserva incerta exige conciliação pelo responsável. O relógio é checado durante a execução; worker substituído ou lease expirado não pode atualizar o relatório final. Timeouts passam AbortSignal ao provedor e não registram erros contendo dados externos.

O relatório deduplica identidades do run por SHA-256 e mantém fonte/data em cada empresa cuja persistência é permitida. As empresas usam os registros existentes de pesquisa, sem criar oportunidades ou registrar receita. Antes das consultas, o runner carrega os registros daquele proprietário, ordenados por atualização, até `knownCompanyLimit` (default 500, máximo 2000); `knownCoverage.limited` informa quando há mais linhas que o limite. Os candidatos persistidos durante a execução entram na mesma coleção, permitindo reconciliação entre consultas e fontes. Uma correspondência forte única com registro existente conta como duplicado e não cria outro registro nem sobrescreve a evidência anterior. `identityAliases` e `reconcileIdentity` tratam identidade pública/URL completa como fortes; domínio/nome geram revisão. Múltiplas correspondências fortes não provocam fusão: a nova identidade, quando distinta, recebe `identityReviewRequired`; os registros anteriores ficam intactos. A deduplicação canônica em banco continua persistente, mas a cobertura de aliases é limitada e não substitui um índice/fila de revisão completo para bases maiores.

Uma execução parcial fica com status `failed` para permitir retomada. Consulta já reservada ou incerta permanece reservada no relatório e não é chamada novamente por uma retentativa. Relatórios de versão antiga sem ledger de custo não são reutilizados silenciosamente para pesquisa paga.

## Execução contínua

O worker ou rota autenticada deve chamar o handler a partir de um agendador em nuvem às **10h30 America/Sao_Paulo**, todos os dias. A declaração do cron, credencial da rota e ativação pertencem ao integrador; estes módulos não publicam infraestrutura. Nunca colocar proprietário/configuração financeira no corpo de uma requisição pública. Escolher horário UTC apenas depois de validar o fuso do provedor; não pressupor que um cron UTC tenha timezone São Paulo.

## Provas

`node qa/prospecting/research.mjs` aplica as migrações reais em SQLite e verifica: distribuição 60/25/15, consultas originais, prioridades, contexto vazio, orçamento persistente inclusive em retomadas, reserva antes da chamada, falhas/timeout sem repetição cega, takeover de lease e fencing, descarte integral de conteúdo com persistência proibida, deduplicação entre fontes sobre registros existentes, ambiguidades sem fusão, limites explícitos de cobertura, separação do CRM, sábado/feriado, atraso na mesma data local, passagem de dia e agendador desligado.

O teste usa dados fictícios e HTTP injetado; não comprova uma publicação Cloudflare/Sites, integração programática real ou ativação de rotina diária.
