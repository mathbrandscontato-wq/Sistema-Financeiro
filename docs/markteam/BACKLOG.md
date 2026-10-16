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
| P0-06 | Qualificação explicável, separando aderência e completude | Núcleo puro implementado, **não usado para decidir automaticamente**. Revisão humana e persistência no CRM disponíveis; pesos automáticos, limiares e calibração pendentes | `lib/markteam.mjs`, `lib/markteam-store.ts`, `app/leads-panel.tsx`; histórico audita a revisão; não presumir pesos |
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
O proprietário confirmou a versão **V2.1 como documento final único**. A matriz de clientes nela descrita: A central (serviços especializados B2B e empresas em crescimento), B complementar (marcas autorais e especialistas), C seletivo (lançamentos de escopo/orçamento compatíveis). O relatório não define pesos numéricos nem metas calibradas: **não inventá-los**. D+3/7/14 são testes orientativos para propostas sem resposta registrada, não para novos cadastros. A regra de triagem no próximo dia útil também é hipótese operacional, com revisão humana. A revisão manual persistida tem autoria e evidência; scoring automático exige pesos e limiares ainda não aprovados.

Sem nova infraestrutura, migração, evento externo, scraping, IA faturada ou mensagem comercial automática nesta etapa.


## Correção 4.0.0-dev.2: gates atuais (prevalecem sobre o inventário histórico)
| Risco | Entregue | Pendência / bloqueio |
| --- | --- | --- |
| R01 | Inventário privado por categorias; main confirmada; QA sem leitura de referência comercial | Proprietário decide visibilidade e saneamento de histórico; avaliar caches/forks; sem force-push |
| R02 | 11 suítes locais com captura/idempotência/expiração/consentimento/concorrência | Fluxo real no D1 isolado e falha de integração externa |
| R03 | Analytics tipado, imports seguros, PDF com regressão antes/depois | 335 erros globais legados; sem supressão; bloqueia aceite global |
| R04 | Runbook separado de código, configuração, D1/R2 | Restore real isolado; RTO/RPO não medidos |
| R05 | Suspensão após resposta registrada, retorno de etapa, intenção de contato, datas atrasadas | Estado persistente de oposição e migração dependem de autorização; canais externos não integrados |
| R06 | Commits temáticos; manifesto de hashes; prova final no SHA do PR | CI remoto e tag de release não executados |
| R07 | Nenhuma nova infraestrutura ou execução paga | Cotas reais e trava de custo antes de qualquer homologação externa |
| R08 | Labels/datas e roteiro local de QA preparados | Chromium indisponível; UI desktop/mobile/teclado não verificada |
| R09 | Role/owner validados nas suítes locais existentes | Spoofing de headers e gateway real não verificáveis neste ambiente |
| R10 | Modelo existente preservado, sem migração | Decidir oportunidade por formulário ou por solicitação independente |

Proposta de opt-out a decidir: estado persistente por contato/canal com autor, data e origem, avaliado antes de qualquer sugestão ou envio. Não confundir consentimento promocional com resposta a atendimento solicitado. Planejar compatibilidade e migração em ambiente isolado antes de aplicar qualquer SQL real. Até lá, revisão humana e registro de negociação/recusa/arquivamento; nenhuma detecção automática é prometida.

P1/P2 permanecem bloqueados por estabilização P0. Refatoração global dos tipos financeiros deve preservar contratos e incluir homologação própria; não foi executada às cegas neste PR.


## Atualização dev.3: supera o bloqueio técnico de lint da dev.2
R03 concluído em desenvolvimento: lint global sem erros, TypeScript e build aprovados preliminarmente. Nenhuma regra desabilitada. Modelo das linhas SQL e DTOs tipados; carregamento inicial não atualiza estado sincronicamente no efeito. Confirmação final no mesmo SHA anexada ao PR.

R08 continua pendente: instalação de Chromium falhou por download truncado. R01/R02/R04/R07/R09/R10 permanecem nos gates e decisões anteriormente registrados. Opt-out persistente não foi inventado nem migrado. CI remoto/tag não executados. P1/P2 continuam fora do escopo. Resolver lint não equivale a homologar UI, gateway, D1/R2, restauração ou quotas reais.
