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
- Verificações preliminares em V8: 50 asserções da fundação. **Substituídas como evidência principal pelo CI nativo** com testes reais e SQLite.
- Revisão estática: tipo da ação corrigido (`kind` no evento), chamadas coerentes entre painel e CRM e nenhuma marca evidente de tokens/segredos nos arquivos alterados. Não substitui a análise de segurança completa.
- **GitHub Actions 38934085398**: 11 suítes nativas PASS (Markteam + SQLite, leads, protection/PDF, commercial, CRM, finance, dashboard, intake, evolution, operations, forms); `pnpm exec tsc --noEmit` PASS; lint restrito a `lib/markteam.mjs`, `lib/markteam-store.ts`, `lib/leads.mjs`, `app/leads-panel.tsx` PASS; `pnpm build` PASS. Evidências: https://github.com/mathbrandscontato-wq/Sistema-Financeiro/actions/runs/38934085398.
- **Única falha do job:** `pnpm lint` global sobre a árvore inteira. Há erros em módulos legados (p.ex. `app/acquisition-panel.tsx` com `no-explicit-any`, variáveis/importações não usadas em `lib/forms-store.ts`, `app/workspace.tsx` e template). Não desabilitar o lint nem atribuir aprovação global. Correções devem ocorrer em um incremento técnico separado, com regressão visual e financeira.
- Runner GitHub Actions instala dependências do lockfile. Não declarar homologação D1 ou QA no navegador.
- Não executadas migrações ou chamadas autenticadas à D1 de produção.
- Não realizado QA visual/celular nem integração real com o Diagnóstico público.

## Próximo incremento obrigatório
1. Fonte final recebida (V2.1). Validar pesos e limiares quantitativos **não definidos no relatório** com operação comercial e testar critérios por perfil A/B/C antes de habilitar scoring no CRM.
2. Testes do incremento, tipagem e build passaram no CI. Tratar o lint global legado sem afrouxar regras, validar a UI/teclado no navegador e executar homologação D1 com fixtures.
3. Homologar fluxos Diagnóstico → CRM e sites → CRM com fixtures fictícias, revisão/concorrência, idempotência e 10 vagas simultâneas em ambiente separado.
4. Validar permissões, comportamento dos botões e datas em desktop/mobile; depois retomar prioridades P0 pendentes.
5. Só com P0 estável: P1/P2 controlados e eventual segunda etapa de publicação.

## Custos / segurança
Nenhuma nova dependência, API paga, credencial, banco, worker, job agendado ou publicação incluídos. Um push/PR pode afetar sistemas externos configurados fora do repositório; verificar integrações antes de qualquer deploy. Não utilizar dados reais de leads em testes.


## Correção isolada V4 — 16/10/2026 (4.0.0-dev.2-rc.1)
Branch: `fix/markteam-v4-hardening-20261016`, derivada de `1aeccc8fb11c744a394b98fc82bb7a7e08a0f5a2`. Exclusivamente código e QA em repositório; não é atualização do Sistema Financeiro publicado.
- Regras: eventos posteriores comprovados de negociação, intake e mudanças de etapa interrompem a cadência da proposta; desempate por timestamp e ID. Datas vencidas recebem flag `overdue` e rótulo visual **Atrasado**, sem editar datas ou enviar mensagens.
- Validação de contato do formulário preservada; imports obsoletos removidos; painel de Analytics tipado com contratos explícitos e erros tratados sem `any` no componente.
- Testes artificiais adicionais em `qa/markteam/followup_additional_checks.mjs` integrados ao CI da branch corretiva. Execução deve ser aferida no HEAD do PR; nenhum PASS é presumido.
- **Gate bloqueado:** repositório público possui arquivo preexistente com categorias comerciais potencialmente restritas. Não reproduzir nem republicar os registros. Visibilidade e reescrita de história só com decisão explícita do titular.
- **Gate bloqueado:** lint global legado já apresentava 363 erros e 13 avisos no CI de origem; correção indiscriminada fora de escopo pode alterar o motor PDF. Não editar `lib/templates/v1/document.mjs` sem baseline integral.
- Homologação externa D1/R2, segurança de cabeçalhos de gateway, prova de restore, consentimento e UX continuam **NÃO VERIFICÁVEIS** por CI local; produção e merge bloqueados.
