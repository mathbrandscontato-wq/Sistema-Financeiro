# Markteam Automático V4 — backlog e rastreabilidade
Atualizado em 16/10/2026. Fonte única de direção: **Math Brands · Markteam Automático — Relatório Estratégico V2.1 (final, 16/10/2026)**. A exigência de Documento A separado está revogada por orientação do proprietário. O arquivo PDF confidencial não é reproduzido neste repositório público. Base técnica: Sistema Financeiro V18. Objetivo: projetos rentáveis com compradores aderentes ao ICP, não volume de cadastros.

## Inventário / P0
| Código | Requisito | Situação | Fonte / ação |
| --- | --- | --- | --- |
| P0-01 | Diagnóstico → sessão → contato → CRM | Existente no código, não homologado ponta a ponta nesta etapa | `app/api/intake/route.ts`, `lib/intake-store.ts`, `lib/intake-plan.mjs`; validar origem externa e banco em homologação |
| P0-02 | Deduplicação, histórico e preservação do consentimento | Existente no código; não revalidado contra banco real | `intake_contact_keys`, `intake_captures`, `commercial_history` |
| P0-03 | Limite de dez contratações promocionais | Existente no código; concorrência deve ser novamente testada | `site_offers`, `offer_seats`, `lib/forms-store.ts` |
| P0-04 | Fila de leads e contatos com próxima ação | Existente, incrementado | `app/leads-panel.tsx` |
| P0-05 | Triagem no próximo dia útil; D+3/7/14 apenas para proposta sem contato posterior registrado | Implementado como **sugestões**; registro humano pela API existente | `lib/markteam.mjs`, `lib/leads.mjs`, `app/crm-workspace.tsx`; hipótese de SLA e feriados locais devem ser configurados |
| P0-06 | Qualificação explicável, separando aderência e completude | Núcleo puro implementado, **não usado para decidir automaticamente**. Configuração de pesos, metas, interface, revisão humana e persistência pendentes | `scoreLead` em `lib/markteam.mjs`; perfis ICP A/B/C descritos no relatório final, sem pesos numéricos presumidos |
| P0-07 | Duplicidade por solicitação / idempotência de eventos | Requer homologação e teste de regressão | Contratos anteriores de captação |
| P0-08 | Tratamento operacional de falhas sem perda silenciosa | Parcial; validação com banco real pendente | API e histórico existentes |
| P0-09 | Gestão de cadências após resposta/decisão | Parcial: cadências sugeridas são manuais, não há motor agendado | Não implantar automação silenciosa |

## P1
- Revisar coortes de aquisição versus conversão e recebimentos, métricas reconciliáveis, origem, motivos de perda e relatórios.
- Preparar registro de experimentos CRO sem publicar copy/alterações públicas automaticamente.
- Pós-venda D+7, D+30, D+90 depende de data real de conclusão (não confundir com contrato ganho).

## P2
- Sinais públicos revisáveis, monitoramento SEO e ideias editoriais: dependem de fontes, autorizações e critérios aprovados; não criar leads frios como se tivessem autorizado contato.
- Experimento de cinco empresas por semana por quatro semanas permanece planejado, sem execução fictícia.
- Integrar produção editorial à Ritmo em vez de duplicar campanhas no Financeiro.

## Decisões bloqueadas / referência
O proprietário confirmou a versão **V2.1 como documento final único**. A matriz de clientes nela descrita: A central (serviços especializados B2B e empresas em crescimento), B complementar (marcas autorais e especialistas), C seletivo (lançamentos de escopo/orçamento compatíveis). O relatório não define pesos numéricos nem metas calibradas: **não inventá-los**. D+3/7/14 são testes orientativos para propostas sem resposta registrada, não para novos cadastros. A regra de triagem no próximo dia útil também é hipótese operacional, com revisão humana. Para habilitar scoring, fornecer configuração explícita e evidências documentadas para cada dimensão, com interface e persistência autorizadas.

Sem nova infraestrutura, migração, evento externo, scraping, IA faturada ou mensagem comercial automática nesta etapa.
