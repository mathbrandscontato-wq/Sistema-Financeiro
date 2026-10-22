# Automação comercial — primeira entrega de homologação

Status: núcleo offline implementado; operação real NÃO ativa. Data de referência: 21/10/2026.

## Auditoria e decisões

Foram consultados o pedido de implementação, estratégia PDF V5, Plano Mestre e prompt V7. O pedido atual autoriza desenvolvimento em branch e PR, mas não publicação, conexão do número real, contatos ou contratação de serviços.

| Item | Evidência / situação |
| --- | --- |
| CRM existente | `lib/crm.mjs`, `lib/crm-store.ts`, tabelas commercial_*: reutilizar; nenhum segundo cadastro de clientes criado |
| Banco e hospedagem | D1/SQLite e worker Vinext/Sites; fila de pesquisa usa o mesmo banco, quando a migração for homologada |
| Captação | intake/formulários, deduplicação de contatos, analytics e permissões já existem |
| Financeiro | pagamentos e contratos existentes permanecem autoridade; núcleo não escreve neles |
| Oferta 500/200/300 | contrato versionado novo preserva V7; schema de `site_offers` mantém default antigo de 30000 centavos: divergência registrada, NÃO prova de preço em produção |
| Regra de vagas | `CONFIRM_SEAT_SQL` exige sinal >= 50% do contrato; R$ 200/R$ 500 = 40%. Resolver separadamente antes de aceitar contratos pelo novo fluxo; não reduzir proteção existente sem auditar uso e dados |
| LP | consulta pública falhou nesta sessão; valores atualizados são evidência documental do proprietário, não nova validação independente; repositório responsável não confirmado |
| Meta/WABA/coexistência | sem conta/permissões verificadas; nenhum número conectado, desconectado ou migrado |
| Política WhatsApp | fonte oficial consultada: https://whatsappbusiness.com/policy/ (opt-in, template para início e janela de atendimento) |
| Plano Mestre antigo | sugestões de branding e regras de fase exclusivamente documental cedem ao pedido atual: campanha só de sites, implementação autorizada |

## Implementado

- `data/prospecting-markets.json`: 15 mercados e 90 consultas extraídas literalmente do Plano Mestre, seis por mercado.
- Política pura: calendário São Paulo, pesquisa após 10h30 todos os dias, contato proativo em dias úteis 9h–17h, calendário de feriados revisado obrigatório, consentimento específico, opt-out, pausa humana, qualidade, templates, janela de 24h e kill-switch ligado por padrão.
- SQL D1/SQLite: pesquisas por proprietário/data, lease com token, retomada de falha, bloqueio de execução duplicada e relatório persistente. Gravadores de pesquisa validam token para impedir escrita de worker substituído.
- Adaptador de pesquisa aceita exclusivamente mocks. Limite de seis consultas por execução por padrão, até 90 explicitamente; máximo de 100 resultados por consulta. Rodízio determinístico de mercado/consulta. Distribuição adaptativa 60/25/15 ainda pendente.
- Fila de empresas pesquisadas separada de interessados. Evidência com fonte/data; score 0–10 A/B/C/D e fonte revisada para cada critério pontuado. Critérios precisam de revisão comercial; nenhum resultado de busca vira interesse.
- Deduplicação por identificador público ou URL completa de perfil, isolada por proprietário. Não mescla nomes/telefones/domínios ambíguos automaticamente; reconciliação entre identificadores diferentes permanece pendente.
- Reserva atômica de até dez primeiros destinatários por conta/data local antes de tentativa. Histórico impede repetir primeiro contato em dias seguintes; tentativa incerta conserva slot. Replay retorna bloqueio. Conta deve ser uma única configuração interna do número comercial, jamais fornecida pelo cliente ou por campanha.
- Simulador conversacional determinístico: preço, objeções, briefing, intenção, encaminhamento e recusa a especificar escopo. Não é agente LLM conectado e não gera abordagem personalizada de produção.
- Redutor de eventos comerciais com transições sequenciais, evidências, aprovação humana, takeover e confirmação financeira vinculada ao CRM. Não escreve pagamentos, contratos ou cobranças.
- Primitiva HMAC de webhook; mensageiro mock impede `send()`. Não existe rota pública de webhook ou adaptador de envio real.
- Registro idempotente de handoff pendente vinculado a oportunidade existente do mesmo proprietário; rascunho de e-mail com destinatário verificado e URL privada de origem permitida. Não cria ainda tarefa visível no painel, não envia e-mail e não presume entrega.

## Executar a homologação local

Requer Node >=22.13 com `node:sqlite` (testado com Node 24). As novas provas não requerem pacote pago nem acesso de rede.

```sh
node qa/prospecting/check.mjs
python qa/prospecting/concurrency.py
node scripts/prospecting-demo.mjs
```

O teste principal aplica TODAS as migrações em SQLite em memória, usa dados fictícios `example.invalid` e verifica que pesquisa não cria oportunidades. A prova concorrente usa 100 tentativas/20 conexões e exige exatamente dez reservas. Os testes não demonstram comportamento em uma conta D1/Meta real.

### Resultado da sessão

- Aprovados: nova suíte `qa/prospecting/check.mjs`, concorrência 100/20 e demonstração offline.
- Aprovados: `tsc --noEmit --incremental false` e geração oficial Drizzle de migração/snapshot. Todas as migrações foram aplicadas em SQLite em memória pelo teste novo.
- Regressão aprovada: leads, commercial, CRM, finance, dashboard, intake, evolution, operations, forms-check, forms-integration, protection/database e finance/migration. Testes que chamam `python3` usaram um preload temporário local redirecionando ao Python disponível; nenhum teste legado foi alterado.
- Bloqueio de ambiente: proteção visual de PDF exige `pdftotext`, `pdffonts` e `pdftoppm` (Poppler), ausentes. Conversão automática CRLF do checkout também exigiu restaurar temporariamente os bytes originais para conferir hashes; nenhum asset ou motor foi incluído no commit.
- Teste legado `forms-concurrency.py`: asserções comerciais passaram, porém processo terminou com falha ao limpar SQLite ainda aberto no Windows. Não contado como suíte aprovada.
- Resultado: 14 de 16 suítes listadas concluíram com sucesso após adaptação de ambiente; duas ficaram limitadas como descrito. Build completo/QA visual e homologação D1/Meta não foram confirmados.
- Envio da branch: autorizado pelo proprietário na continuação da sessão. Branch enviada e PR de rascunho #4 criado: https://github.com/mathbrandscontato-wq/Sistema-Financeiro/pull/4. Nada incorporado a main ou publicado em produção.

## Componentes ainda necessários

1. Validar oferta atual no CRM e regra de reserva de vagas para sinal de R$ 200; corrigir em tarefa separada após auditoria de impacto.
2. Completar deduplicação com múltiplas chaves e fila de ambiguidade; priorizar interessados existentes e rodízio comercial 60/25/15.
3. Selecionar fonte autorizada e orçamento de pesquisa; implementar adaptador real com timeout, limites de custo e rastreabilidade. Não foi escolhido fornecedor pago.
4. Registrar calendário completo nacional/SC/Joinville, consentimentos persistentes e revogações, RBAC, retenção e auditoria de acesso. Não reaproveitar aceite de analytics como opt-in WhatsApp.
5. Implementar execução em nuvem via serviço compatível com Sites: cron diário **10h30 America/Sao_Paulo**. O worker atual só tem `fetch`; nesta entrega não foi alterado. Persistência e elegibilidade de horário estão prontas; o agendador real NÃO foi instalado. Validar fuso do provedor; UTC 13h30 só se regra de fuso vigente confirmar. Evitar criar infraestrutura redundante.
6. Validar Meta Business/WABA, permissões, coexistência e dispositivos vinculados em leitura; escolher Cloud API/BSP. Conexão real requer autorização específica.
7. Criar ingress de webhook autenticado, deduplicação de eventos, locks persistentes de conversa, eco de envio humano e retomada explícita. Integrar pausa às respostas, template aprovado, janela, qualidade e política antes de CADA envio.
8. Integrar agente contextual com fontes confiáveis, revisão de saída e proteção contra injeção. Simulador atual é uma prova de contrato e não substitui avaliação de IA em conversas reais.
9. Ligar handoff às tarefas/histórico do CRM pelo serviço protegido existente; configurar destinatário aprovado, provedor de e-mail, retries, DLQ e confirmação de aceitação/entrega. Nunca marcar handoff concluído só porque foi enfileirado.
10. Importar Pix oficial validado por canal seguro, relacionar aceite/aprovação/capacidade e comprovação financeira real. NÃO ler Pix do aplicativo por suposição.
11. QA de LP/briefing/consentimento e editoriais em repositório correto; validar mobile e regressão financeira completa antes de piloto.

## Custos, riscos e GO/NO-GO

Não foi contratado serviço. O núcleo e os testes não fizeram chamadas de IA, busca paga, Meta ou e-mail. A hospedagem/D1 existente pode gerar custos conforme uso; não foram consultadas faturas. Custos futuros de busca, IA, templates, e-mail e agendamento dependem do fornecedor e do orçamento aprovado; sem estimativa numérica inventada.

**NO-GO para produção**: identidade/consentimento persistente, envio oficial, calendário, tasks/e-mail, agendador em nuvem, integração financeira, oferta/vagas e QA de produção estão pendentes. **GO para homologação offline** do núcleo e revisão do PR.

Rollback: sem aplicação em produção, basta não incorporar a branch. Se a migração for aplicada futuramente, desligar jobs e envios, conservar as tabelas novas/auditoria e reverter código; não excluir dados nem reverter tabelas financeiras. Fazer snapshot pelo mecanismo já existente antes de qualquer migração real. Homologar nova migração em D1 de teste e verificar contagens/checksums das tabelas financeiras antes/depois.

Próxima etapa técnica: revisar este PR, validar oferta/vagas e criar staging D1 isolado; então integrar fonte autorizada, scheduler e webhooks de teste. Fornecer configurações externas apenas quando esses componentes forem homologados. Aprovação de produção continua separada.
