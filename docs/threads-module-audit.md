# Threads | Oportunidades e Publicações — implementação incremental

## Auditoria — 11/11/2026
- Repo verificado: `mathbrandscontato-wq/Sistema-Financeiro` (branch principal `main`).
- Stack comprovada no package.json: Next 16, React 19, Vinext, Cloudflare Workers, D1/SQLite e Drizzle.
- Já existem entidades de clientes, oportunidades, contratos, pagamentos e histórico comercial em `db/schema.ts`. Reusar o CRM; **não criar CRM paralelo**.
- Conta Windsor.ai Threads conectada: `MATH BRANDS | Estúdio Criativo (math.brands)`; ações expostas: `create_text_post`, `create_image_post`, `create_reply`. Nenhuma escrita foi executada.
- Consulta de leitura `post_id,post_text,post_timestamp,post_views,post_likes,post_replies,post_permalink` concluída com dados reais de publicação, no intervalo de 7 dias.
- Consulta de campos expõe estatísticas de posts, perfil e replies, mas disponibilidade de cada tabela/escopo precisa ser testada em separado.
- Fonte estratégica: planejamento 2027 Google Doc; referência de leads: planilha Acompanhamento de Prospecção — Marcas Pessoais.
- Integração MCP autenticada no ChatGPT **não** prova uma integração backend persistente. Segredos, endpoints, planos e permissões do servidor continuam não verificados.

## Primeiro incremento desta branch
`lib/threads-qualification.mjs`: motor comercial puro com seis critérios (0–2), evidência obrigatória para pontuação positiva, prioridades configuradas no prompt, veto independente de contato, normalização de URL, chave de deduplicação, limite de follow-up e barreira explícita para envio externo.
`qa/threads/check.mjs`: testes determinísticos executáveis com `node qa/threads/check.mjs`.
Não há conexão de banco, UI, cron nem publicação nesta entrega inicial. Não declarar como módulo completo.

## Matriz de capacidades (situação real)
| Recurso | Estado | Observação |
|---|---|---|
| Conta Threads no Windsor.ai | Conectada e identificada | Necessário avaliar persistência backend |
| Leitura de publicações e métricas de post | Disponível e testada no conector | Apenas leitura interativa |
| Criar post de texto/imagem/resposta pública | Disponível, não autorizado para execução | Sem teste de escrita |
| Pesquisa de posts de terceiros | Não verificado | Investigar API oficial, permissões, limites |
| Envio de DM | Não verificado | Não presumir |
| Agendamento no backend | Não implementado | Exige persistência, fila, idempotência |
| Qualificação comercial determinística | Implementação inicial | Sem interface/CRM |
| CRM existente | Identificado no schema | Integração ainda pendente |
| Dashboard financeiro integrado | Não implementado | Não simular métricas |

## Próxima fase
1. Validar credenciais persistentes oficiais para o backend, com privilégios mínimos.
2. Inspecionar migrações e rotas CRM existentes; criar tabelas de posts/interações com `owner`, IDs externos únicos e auditoria.
3. Criar leitura autenticada e interface real reutilizando os componentes e as permissões do sistema.
4. Desenvolver importação manual de URLs com qualificação baseada em evidências e aprovação.
5. Implementar calendário, fila idempotente, métricas reais e testes integrados.
6. Aprovar separadamente cada política de envio externo; publicar em produção só após homologação.

## Salvaguardas
Nenhuma credencial em git; nenhuma abordagem em massa; respeitar LGPD, termos do Threads e recusas; no máximo duas tentativas sem resposta em follow-ups com interesse prévio; dados indisponíveis não podem ser apresentados como zero. O plano estratégico de conteúdo 2027 não é oferta publicada.
