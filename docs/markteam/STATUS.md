# Status persistente — Markteam Automático V4
Data: 16/10/2026
Documento de produto **único e final**: Relatório Estratégico Markteam Automático V2.1. Documento A separado dispensado pelo proprietário; PDF confidencial não versionado no GitHub público.

## Estado
Desenvolvimento incremental em `feat/markteam-automatico-v4`, criado a partir da `main` (commit `6d18c9184c60961054373661e0c91d4b68f1b048`). Não publicar, não fazer merge. A aplicação oficial é separada da cópia do código.

## Implementado
- `lib/markteam.mjs`: **triagem D+1 dia útil** para novos leads e **D+3/D+7/D+14 dias úteis** apenas para propostas com transição auditada para a etapa “Proposta enviada” e nenhuma negociação posterior registrada. Feriados podem ser fornecidos explicitamente; sem calendário local presumido.
- Regras não sugerem novas datas para oportunidades concluídas, arquivadas ou que já tenham `next_action_on` definido; escolha e gravação são humanas.
- `lib/leads.mjs`: referência temporal extraída da transição **registrada** para “Proposta enviada”. A mudança de etapa é evidência operacional, **não** confirmação técnica independente de entrega da mensagem. Usuário deve revisar o histórico antes de usar a cadência.
- `app/leads-panel.tsx` + `app/crm-workspace.tsx`: botões discretos na lista de leads; ao selecionar, usam `save_opportunity` com `revision` e reaproveitam o armazenamento/proteção/auditoria do CRM.
- `scoreLead`: motor puro de scoring configurável com seis dimensões, evidência textual obrigatória, perfis A/B/C como referência e classes (alta/média/investigação/fora do perfil sob evidência explícita). O relatório não define pesos: não pontua registros reais automaticamente.
- Revisão humana persistente: `lib/markteam-store.ts` + `markteam_review` autenticado por CRM, idempotência, controle de revisão, backup e trilha de auditoria. Interface com prioridade, perfil ICP A/B/C, justificativa, evidência e filtros.
- `qa/markteam/store-check.mjs` valida a persistência em SQLite isolado, inclusive conflitos, reenvio e recuperação de backup; integrado em `pnpm test:markteam` e no build.
- `docs/markteam/INTEGRATION_CONTRACTS.md` descreve limites e integração.
- `.github/workflows/markteam-qa.yml` executa testes apenas na branch em runner público gratuito, sem publicação.

## Evidência de execução
- **50 verificações passaram**, executadas em V8 isolado sobre as versões atuais de `lib/markteam.mjs` + `qa/markteam/check.mjs` (30 asserts) e a seção fundamental de `lib/leads.mjs` + `qa/leads/check.mjs` (20 asserts). É um subconjunto de testes adaptado, não a suíte Node/pnpm oficial.
- Revisão estática: tipo da ação corrigido (`kind` no evento), chamadas coerentes entre painel e CRM e nenhuma marca evidente de tokens/segredos nos arquivos alterados. Não substitui a análise de segurança completa.
- GitHub Actions 38932169389 passou nas 11 suítes nativas e no build, incluindo a fidelidade do PDF com Poppler. Tipagem e lint falharam nessa revisão intermediária; erros de TypeScript do incremento foram corrigidos após esse run, aguardando nova evidência. O lint global também tem erros em arquivos legados.
- Runner GitHub Actions instala dependências do lockfile. Não declarar homologação D1 ou QA no navegador.
- Não executadas migrações ou chamadas autenticadas à D1 de produção.
- Não realizado QA visual/celular nem integração real com o Diagnóstico público.

## Próximo incremento obrigatório
1. Fonte final recebida (V2.1). Validar pesos e limiares quantitativos **não definidos no relatório** com operação comercial e testar critérios por perfil A/B/C antes de habilitar scoring no CRM.
2. Conferir TypeScript e lint restrito na execução final do CI; preservar pendências de lint legadas documentadas e validar a UI/teclado no navegador.
3. Homologar fluxos Diagnóstico → CRM e sites → CRM com fixtures fictícias, revisão/concorrência, idempotência e 10 vagas simultâneas em ambiente separado.
4. Validar permissões, comportamento dos botões e datas em desktop/mobile; depois retomar prioridades P0 pendentes.
5. Só com P0 estável: P1/P2 controlados e eventual segunda etapa de publicação.

## Custos / segurança
Nenhuma nova dependência, API paga, credencial, banco, worker, job agendado ou publicação incluídos. Um push/PR pode afetar sistemas externos configurados fora do repositório; verificar integrações antes de qualquer deploy. Não utilizar dados reais de leads em testes.
