# Markteam Automático V4 — backlog e rastreabilidade
Atualizado em 16/10/2026. Base: Sistema Financeiro V18; a descrição da Etapa 1 é o escopo disponível nesta sessão.

## Inventário / P0
| Código | Requisito | Situação | Fonte / ação |
| --- | --- | --- | --- |
| P0-01 | Diagnóstico → sessão → contato → CRM | Existente no código, não homologado ponta a ponta nesta etapa | `app/api/intake/route.ts`, `lib/intake-store.ts`, `lib/intake-plan.mjs`; validar origem externa e banco em homologação |
| P0-02 | Deduplicação, histórico e preservação do consentimento | Existente no código; não revalidado contra banco real | `intake_contact_keys`, `intake_captures`, `commercial_history` |
| P0-03 | Limite de dez contratações promocionais | Existente no código; concorrência deve ser novamente testada | `site_offers`, `offer_seats`, `lib/forms-store.ts` |
| P0-04 | Fila de leads e contatos com próxima ação | Existente, incrementado | `app/leads-panel.tsx` |
| P0-05 | Sugestões D+3, D+7, D+14 dias úteis | Implementado; gravação manual integrada ao CRM | `lib/markteam.mjs`, `app/crm-workspace.tsx` |
| P0-06 | Pontuação baseada em fatos verificáveis | Núcleo puro implementado; integração de dados, configuração persistida e política comercial pendentes | `scoreLead` em `lib/markteam.mjs` |
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
Os documentos complementares A (Especificação V1.0) e B (Relatório Estratégico V2.1) foram citados no pedido, mas seus conteúdos não estavam acessíveis nesta execução. NÃO supor ICP, pesos/limiares do scoring, cadência a partir de respostas, regras de capacidade, custos da infraestrutura ou condições comerciais. Para habilitar scoring, fornecer configuração explícita e evidências documentadas para cada dimensão, com interface e persistência autorizadas.

Sem nova infraestrutura, migração, evento externo, scraping, IA faturada ou mensagem comercial automática nesta etapa.
