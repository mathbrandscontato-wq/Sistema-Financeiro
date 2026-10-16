# Status persistente — Markteam Automático V4
Data: 16/10/2026

## Estado
Desenvolvimento incremental em `feat/markteam-automatico-v4`, criado a partir da `main` (commit `6d18c9184c60961054373661e0c91d4b68f1b048`). Não publicar, não fazer merge. A aplicação oficial é separada da cópia do código.

## Implementado
- `lib/markteam.mjs`: datas de acompanhamento comercial em dias úteis D+3/D+7/D+14 a partir da data de captura/cadastro. Feriados podem ser fornecidos explicitamente; sem calendário de feriados assumido.
- Regras não sugerem novas datas para oportunidades concluídas, arquivadas ou que já tenham `next_action_on` definido; escolha e gravação são humanas.
- `app/leads-panel.tsx` + `app/crm-workspace.tsx`: botões discretos na lista de leads; ao selecionar, usam `save_opportunity` com `revision` e reaproveitam o armazenamento/proteção/auditoria do CRM.
- `scoreLead`: motor puro de scoring configurável com seis dimensões e evidência textual obrigatória; sem regras comerciais aprovadas, não pontua registros automaticamente.
- `qa/markteam/check.mjs` e `test:markteam` adicionados; inclusão no comando `build`.

## Evidência de execução
- 19 afirmações da nova suíte passaram em V8 isolado, avaliando **o conteúdo remoto da branch** com as importações de módulo adaptadas para a execução; não é execução oficial pelo Node/pnpm.
- Não foi possível instalar dependências, clonar o repositório ou rodar `pnpm test:*`, `pnpm exec tsc --noEmit`, ESLint e build completo neste ambiente. Não declarar essas verificações como concluídas.
- Não executadas migrações ou chamadas autenticadas à D1 de produção.
- Não realizado QA visual/celular nem integração real com o Diagnóstico público.

## Próximo incremento obrigatório
1. Obter documentos A/B, decidir e validar ICP, pesos, limiares e fontes de evidência. Configurar e persistir scoring sem inventar dados.
2. Executar testes existentes e novo teste em checkout Node 22+/pnpm 11; corrigir regressões e rodar tipagem/build.
3. Homologar fluxos Diagnóstico → CRM e sites → CRM com fixtures fictícias, revisão/concorrência, idempotência e 10 vagas simultâneas em ambiente separado.
4. Validar permissões, comportamento dos botões e datas em desktop/mobile; depois retomar prioridades P0 pendentes.
5. Só com P0 estável: P1/P2 controlados e eventual segunda etapa de publicação.

## Custos / segurança
Nenhuma nova dependência, API paga, credencial, banco, worker, job agendado ou publicação incluídos. Um push/PR pode afetar sistemas externos configurados fora do repositório; verificar integrações antes de qualquer deploy. Não utilizar dados reais de leads em testes.
