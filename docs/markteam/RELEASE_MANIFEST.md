# Release Manifest — Markteam Automático V4 (desenvolvimento)
Data: 16/10/2026. Estado: **incremento parcial, não apto a deploy**. Fonte de direção única: Relatório Estratégico Markteam Automático V2.1 (final); o segundo documento mencionado no prompt foi dispensado.

## Repositório e origem
- Repositório: https://github.com/mathbrandscontato-wq/Sistema-Financeiro
- Base imutável nesta etapa: `main` em `6d18c9184c60961054373661e0c91d4b68f1b048`.
- Branch: `feat/markteam-automatico-v4`.
- Pull Request: **a preencher após abertura em draft**. Nunca fazer merge nesta etapa.
- Exportação de origem: `SOURCE_VERSION.json` com Sites V18, exportada em 16/10/2026. Não há confirmação de equivalência com produção atual.

## Mudanças implementadas
- Motor `lib/markteam.mjs`: triagem de novos leads D+1 útil; D+3/7/14 **exclusivamente após envio de proposta comprovado no CRM**, sem posterior negociação registrada. O histórico fica em `lib/leads.mjs`; nenhum disparo automático.
- Perfis A/B/C e classes comerciais do relatório final são diretrizes, sem pesos/limiares inventados.
- Escolha humana no painel de leads para registrar `next_action_on` usando a rota CRM autenticada existente. Não há envio de mensagens.
- Scoring configurável somente quando os seis critérios recebem valores e evidências explícitas e existe política de pesos/limiares válida. **Ainda não integrado à UI, nem persistido.**
- QA isolado para regras e `pnpm test:markteam` incluído no build.

## Pendências e dependências
- Documento final V2.1 recebido e adotado como fonte única. Metas numéricas, pesos, limiares, status de retorno do comprador e evidências de capacidade **não constam suficientemente definidos** para ativação automática.
- P0 de captação, deduplicação, consentimento, concorrência das dez vagas e erro/recuperação precisam de testes ponta a ponta; módulos já existiam e não foram reconstruídos.
- P1 (funil, métricas por coorte, experimentos, pós-venda) e P2 (pesquisa pública, SEO, editorial) permanecem pendentes.
- Os testes legados, tipo, lint e build, navegação responsiva e homologação D1 não puderam ser executados nesta sessão.
- Nenhuma integração com Ritmo ou plataforma externa foi ativada.

## Banco, segredos e custos
- Migrações: **nenhuma nova**. Dados e contratos existentes intocados.
- Variáveis novas: **nenhuma**. Autenticação continua via `workspaceAccess` e API CRM existentes; não inserir tokens no Git.
- Custo adicional desta alteração: **sem contratação ou integração faturável**. Custo operacional e quotas do hosting existente NÃO foram medidos.
- Branch `main` sem proteção no momento da inspeção; rulesets: nenhum. Não havia `.github/workflows` na árvore exportada. Automações externas ao GitHub não verificadas.

## Testes conhecidos
| Verificação | Resultado |
| --- | --- |
| Primeira versão da lógica em V8 antes da revisão do relatório final | 19 asserts: PASS; não cobre a revisão posterior |
| `pnpm test:markteam` nativo | Não executado |
| Todos os `pnpm test:*` anteriores | Não executados |
| TypeScript, ESLint e build | Não executados |
| Segurança e concorrência em D1 de homologação | Não executados |
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
