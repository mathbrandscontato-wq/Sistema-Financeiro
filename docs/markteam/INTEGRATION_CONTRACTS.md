# Contratos e limites de integração — Markteam V2.1
Data: 16/10/2026. Referência única: Relatório Estratégico V2.1 **final** (material confidencial; PDF não incluído neste repositório público).

## Fontes da verdade e canais
| Domínio | Fonte de verdade | Implementação / fronteira |
| --- | --- | --- |
| Interessados e oportunidades | CRM do Sistema Financeiro | `commercial_clients`, `commercial_opportunities`, `commercial_history`, `app/api/commercial/route.ts` |
| Diagnóstico e formulários | Entrada de serviços do Financeiro | `app/api/intake/route.ts`, `lib/intake-store.ts`, `lib/forms-store.ts` |
| Propostas, contratos e pagamentos | Financeiro | Tabelas comerciais e de pagamentos; não inferir pagamento de status "Fechado" |
| Produção e capacidade | Ritmo | Integração futura condicionada a acesso autorizado e dados agregados reais |
| Qualificação / Markteam | **Histórico comercial existente**, sem segundo CRM | `markteam_review` → `reviewLead` → `commercial_history`, com revisão otimista e snapshot prévio |

## API interna de classificação (novo incremento)
**Entrada:** `POST /api/commercial`; requer a sessão de trabalho existente e permissão `crm.write`.
Corpo `{action:"markteam_review",id,revision,mutationId,qualification:{classification,icpTier,explanation,evidence}}`. Usar UUID estável por envio. Os campos de `qualification` são escolhas e evidências revisadas por pessoa; o servidor os valida independentemente do frontend.

**Persistência:** `commercial_opportunities.revision` incrementada condicionalmente e evento `commercial_history.data` com `kind=markteam_qualification`, método manual, ator, data e modelo `markteam-v2.1`. A alteração é atômica pelo `D1.batch`, sob `owner`, com proteção antes da mutação. Mesmo `mutationId` com conteúdo idêntico devolve sucesso reutilizado; payload diferente gera conflito 409; revisão obsoleta devolve 409. O histórico é append-only e a revisão humana seguinte gera evento novo. **Nenhum contrato, proposta, valor ou recebimento é alterado.**

**Resultado:** `{ok:true,id,reused?:true}`. Sem pontuação estatística ou envio externo. Se `icpTier=unknown`, `classification` deve ser Investigação; justificativa e fonte são obrigatórias. Perfis do relatório: A (central, B2B especializado/crescimento), B (complementar, marcas autorais/especialistas), C (seletivo, lançamento de escopo compatível).

**Limites:** políticas numéricas de pesos/limiares e validação estatística NÃO constam no relatório. `scoreLead()` é núcleo puro não conectado a leads reais. Não classificar automaticamente por nome, segmento ou estética do site.

## Formulário público → CRM (base já existente; homologação pendente)
**Autenticação:** `/api/intake` recebe `X-Math-Intake-Key` gerado pela integração autenticada de serviço. `INTAKE_SHARED_SECRET`, `INTAKE_OWNER` e `COMMERCIAL_SITE_TOKEN` são variáveis de runtime e nunca devem ir a frontends ou commits. Acesso HTTP 401 sem autorização significa fronteira de acesso funcionando, não prova de falha da integração.

**Entrada:** diagnóstico `start` → `diagnose` → `capture` → `intent`; formulários de site usam `site_submit`. `requestId` fornece repetibilidade; tokens de sessão têm hash no servidor; `marketing` permanece separado de ciência do aviso de privacidade. `submission_id`, origem, UTM validada e timestamp devem permanecer rastreáveis. Nunca enviar dados pessoais ou respostas identificáveis ao GA4.

**Deduplicação:** contato por chaves normalizadas de e-mail/telefone e conflito manual; a mesma requisição não deve gerar cliente duplicado. Atenção: a implementação existente associa solicitações do mesmo cliente e formulário à mesma oportunidade por `intake_lead_links`; não garante, ainda, oportunidades independentes para necessidades distintas no **mesmo formulário**. Reavaliar modelagem e migração somente após testes de regressão e homologação. Não fundir pessoas apenas pelo nome.

**Falhas:** retorno de sucesso apenas após confirmação de persistência. Testar falhas transitórias, token inválido/expirado, proteção indisponível, repetição com payload diferente, abuso/limites e isolamento entre proprietários. Usar fixtures fictícias, não produção.

**Promoção sites:** limite de dez contratações controlado por `site_offers` e `offer_seats`, com SQL condicional. Confirmar concorrência no SQLite e depois em D1 de homologação. Nunca dar baixa em contratos/pagamentos durante testes.

## Cadências e tarefas (MVP)
- Novo lead sem próxima ação definida: sugestão de triagem no próximo dia útil, configurável no futuro. Não representa SLA comprovado.
- Proposta: D+3, D+7 e D+14 dias úteis são **hipóteses de acompanhamento**, só exibidas quando há transição para "Proposta enviada" documentada, sem negociação posterior registrada.
- Transição de etapa **não prova o efetivo envio/entrega** de proposta nem que nenhum contato externo ocorreu; o responsável deve conferir.
- O usuário escolhe e grava a ação; o CRM mantém revisão, trilha de auditoria e cancelamento/adiamento pelo editor existente.
- Feriados podem ser passados a `addBusinessDays` para testes/uso futuro; a interface ainda não oferece calendário municipal/estadual validado.
- Não enviar WhatsApp, DM, e-mail ou publicar conteúdo por processo automático. Respostas e opt-out devem prevalecer sobre sugestões.

## Analytics, governança e continuidade
O painel de aquisição existente possui eventos, filtros e fontes persistidas. Preservar coortes, separar propostas de fechamentos e recebimentos, exibir lacunas como "sem dado" em vez de zero inventado. P1 deve priorizar reconciliação de métricas e CRO, não volume de cards. P2 (RSS/sinais públicos e editorial) permanece condicionado à estabilização do P0. Sem criação automática de lead frio nem scraping de dados privados.

## Quality gates antes de ativar produção
1. Testes com Node/pnpm, validação TypeScript, lint e build (inclusive fidelidade do PDF financeiro).
2. Captura → sessão → oportunidade → histórico sem duplicações, com idempotência, proteção e recuperação em banco isolado.
3. Revisão humana persistida, retentativa igual, conflito 409 e isolamento de proprietário (teste SQLite do incremento + ambiente real).
4. Responsividade, acessibilidade, revisão humana e exportações.
5. Cotas de hospedagem e rollback efetivamente testados antes de qualquer deploy.


## Atualização corretiva 4.0.0-dev.2
- `proposalEvidence` ordena por `created`, depois ID; somente eventos posteriores à última transição de proposta são usados. Suspensão por `negotiation`, `intake`, `diagnostic_intent` ou transição para Negociação, Contato inicial, Fechado ou Recusado. Voltar a Aguardando resposta não remove a suspensão. Uma nova proposta registrada gera nova referência, sempre revisável por pessoa.
- `followUpChoices(lead,{today,holidays})` adiciona `overdue` sem gravar ou mover datas. `isFollowUpOverdue` também identifica próxima ação já agendada no passado. Dia atual não é atrasado. Fuso local America/Sao_Paulo.
- Resposta externa e opt-out não são identificados automaticamente. Não existe campo persistente específico de oposição; autorização para eventual migração é gate de negócio. Marketing=false não é oposição universal ao atendimento solicitado.
- API Analytics e matemática de `formMetrics` preservadas. `lib/acquisition-types.ts` documenta DTO consumido, métricas opcionais por permissão, lead e união de ações confirm/release/configure. A tipagem não substitui validação do servidor nem prova de contrato contra D1 real.
- SQLite comprova rollback quando a gravação de histórico falha após incremento de revisão; não constitui prova do gateway nem de restore D1/R2.
- Aplicação continua confiando em headers do gateway. Homologação deve rejeitar falsificação por cliente e acesso direto; nenhuma chave foi inventada nem adicionada ao frontend para simular segurança.
- Gateway, D1/R2, quotas, consentimento no canal real e restauração permanecem bloqueados para produção. Nenhum teste acessou endpoints publicados.


## Contratos técnicos dev.3
`db-types.ts` representa colunas/tipos/nulabilidade do schema já existente, sem SQL novo. `service-types.ts`, `ui-types.ts` e `operations-types.ts` nomeiam requests, respostas, comandos de desenho e modelos de formulário. Tipos de request não substituem os validadores existentes; JSON recebido e erros permanecem fronteiras não confiáveis.

Consultas SQL, regras de pagamento, conciliação, revisão, snapshots, consentimento e deduplicação foram preservados. `errorDetails` mantém mensagem/status válidos e os endpoints preservam suas mensagens de fallback e códigos. `fetchJson` é somente leitura de resposta interna autenticada, com cache no-store e propagação de falhas de rede/HTTP.

O carregamento dos painéis ocorre após conclusão de rede e ignora updates após desmontagem. Dashboard/prévia têm chave de requisição e estado de espera derivado; conferências, cancelamento e escrita continuam manuais. Datas ausentes da timeline são exibidas como Sem data.

Novas evidências locais: zero erros de lint global, tipagem estrita, testes de fronteiras e contato do portfólio. Não comprovam headers de gateway, D1/R2 reais, restauração, quotas nem UI em navegador. Mantidos os gates de negócio e o isolamento da aplicação publicada.
