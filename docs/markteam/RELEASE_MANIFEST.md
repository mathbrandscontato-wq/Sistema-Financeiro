# Release Manifest — Markteam Automático V4 (desenvolvimento)
Data: 16/10/2026. Estado: **incremento parcial, não apto a deploy**. Fonte de direção única: Relatório Estratégico Markteam Automático V2.1 (final); o segundo documento mencionado no prompt foi dispensado.

**Pacote versionado:** `4.0.0-dev.1` (pré-homologação, não release de produção).

## Repositório e origem
- Repositório: https://github.com/mathbrandscontato-wq/Sistema-Financeiro
- Base imutável nesta etapa: `main` em `6d18c9184c60961054373661e0c91d4b68f1b048`.
- Branch: `feat/markteam-automatico-v4`.
- Pull Request: **#1, rascunho, sem merge** — https://github.com/mathbrandscontato-wq/Sistema-Financeiro/pull/1. Nunca fazer merge nesta etapa.
- Exportação de origem: `SOURCE_VERSION.json` com Sites V18, exportada em 16/10/2026. Não há confirmação de equivalência com produção atual.

## Mudanças implementadas
- Motor `lib/markteam.mjs`: triagem de novos leads D+1 útil; D+3/7/14 **somente com transição para “Proposta enviada” registrada no histórico do CRM**, sem posterior negociação registrada. O histórico fica em `lib/leads.mjs`; nenhum disparo automático.
- Perfis A/B/C e classes comerciais do relatório final são diretrizes, sem pesos/limiares inventados.
- Escolha humana no painel de leads para registrar `next_action_on` usando a rota CRM autenticada existente. Não há envio de mensagens. **Importante**: a transição de etapa é evidência de registro comercial, não confirmação independente do envio nem ausência garantida de respostas.
- Scoring configurável somente quando os seis critérios recebem valores e evidências explícitas e existe política de pesos/limiares válida. **Ainda não integrado à UI, nem persistido.**
- Classificação comercial **manual**, com perfil A/B/C, prioridade, justificativa e evidência, persistida no histórico de CRM com revisão, idempotência e snapshot; filtros e consulta no painel de leads. Scoring ponderado automático permanece desligado.
- QA nativo com SQLite de teste, contratos em `docs/markteam/INTEGRATION_CONTRACTS.md` e workflow seguro de GitHub Actions.
- `pnpm test:markteam` integrado no build, incluindo teste de persistência do histórico.

## Pendências e dependências
- Documento final V2.1 recebido e adotado como fonte única. Metas numéricas, pesos, limiares, status de retorno do comprador e evidências de capacidade **não constam suficientemente definidos** para ativação automática.
- P0 de captação, deduplicação, consentimento, concorrência das dez vagas e erro/recuperação precisam de testes ponta a ponta; módulos já existiam e não foram reconstruídos.
- P1 (funil, métricas por coorte, experimentos, pós-venda) e P2 (pesquisa pública, SEO, editorial) permanecem pendentes.
- Em Actions 38932169389 passaram todas as 11 suítes nativas e o build; TypeScript e lint apontaram erros na revisão intermediária, com correções de tipagem posteriores. O lint global inclui dívida técnica legada. A última revisão do CI, UI responsiva e homologação D1 ainda precisam ser confirmadas.
- Nenhuma integração com Ritmo ou plataforma externa foi ativada.

## Banco, segredos e custos
- Migrações: **nenhuma nova**. Dados e contratos existentes intocados.
- Variáveis de produção novas: **nenhuma**. Autenticação continua via `workspaceAccess` e API CRM existentes; não inserir tokens no Git.
- Adicionado GitHub Actions apenas para CI usando runner padrão de repositório público (gratuito), sem segredos nem ações de deploy.
- Custo adicional desta alteração: **sem contratação ou integração faturável**. Custo operacional e quotas do hosting existente NÃO foram medidos.
- Branch `main` sem proteção no momento da inspeção; rulesets: nenhum. Não havia `.github/workflows` na árvore exportada. Automações externas ao GitHub não verificadas.

## Testes conhecidos
| Verificação | Resultado |
| --- | --- |
| Suítes atuais adaptadas em V8 isolado | 50 asserts: PASS (30 Markteam + 20 de fundamentos de leads) |
| 11 suítes nativas do projeto, incluindo SQLite, em Actions 38932169389 | PASS |
| `pnpm build` no mesmo runner | PASS |
| TypeScript em revisão intermediária | FAIL, correções posteriores aguardam CI final |\n| ESLint global em revisão intermediária | FAIL em arquivos legados, não suprimido |\n| ESLint do módulo novo | Aguardando CI final |
| Revisão manual no SQLite isolado | PASS, incluindo idempotência, isolamento, revisão e backup |\n| Segurança e concorrência em D1 de homologação | Não executados |
| Deploy/produção | Não acionado |

## Homologação (etapa futura e separada)
1. Conferir contrato de configuração externa e gatilhos de deploy/preview; garantir ambiente e banco isolados, sem custo adicional.
2. Em checkout da branch, instalar com lockfile (Node >=22.13, pnpm 11), executar `pnpm test:markteam`, as suítes existentes, `pnpm exec tsc --noEmit`, `pnpm lint` e `pnpm build`; registrar logs.
3. Executar cenários de lead novo, recorrente, ações existentes, concluídos, vazios, concorrência e revisão 409; confirmar nenhuma notificação externa.
4. Validar desktop/mobile e regras da LGPD com dados fictícios; medir quotas reais sem habilitar faturamento.
5. Aprovar a política comercial e concluir integrações pendentes antes de autorizar rollout.

## Deploy e rollback (NÃO EXECUTAR AGORA)
- Após homologação, executar segunda etapa com aprovação de negócio e infraestrutura comprovada; atualizar projeto hospedado separadamente após validação do artefato.
- Como `main` e produção não são alteradas nesta etapa, o rollback imediato consiste apenas em fechar o PR draft e abandonar a branch. Se uma versão futura for publicada, manter backup D1/R2 e versão previamente funcional para reversão controlada, sem migrar banco em produção nesta etapa.

## Referências
- `docs/markteam/BACKLOG.md`
- `docs/markteam/STATUS.md`
- `docs/intake-and-kanban.md`
- `docs/crm-operations.md`
