# Orquestrador do atendimento comercial

`createCommercialRuntime({db,owner,clock,agent,whatsapp,email,beforeWrite,liveNetworkApproved=false,beforeSend})` compõe os serviços de persistência, política, agente e transportes. Recebe dependências explicitamente e não descobre credenciais. Os handlers HTTP e as ferramentas do CRM devem aplicar RBAC/autenticação antes de invocá-lo.

## Entradas e processamento

- `receiveNormalizedEvents(events)` aceita até cem eventos normalizados por chamada. A assinatura do webhook deve ser conferida antes. Eventos de conta diferente são ignorados. `inbound` exige timestamp original; eco humano pausa a conversa; `status` resolve o destinatário pelo id de provedor já registrado na outbox. Não aceita destinatário inventado em callback de entrega desconhecido.
- `processInbox({limit=10})` processa até cinquenta entradas por chamada, com lease idempotente de inbox e exclusividade de conversa. Uma conversa ocupada devolve a entrada para `pending` sem consumir tentativa; sucessivas chamadas concorrentes não a levam à DLQ. Kill-switch impede respostas. Pausa e opt-out prevalecem. A hora original mantém a janela de atendimento; uma entrega tardia não a reabre.
- O agente externo só é consultado quando a conta não é dry-run, o kill-switch está desligado e `liveNetworkApproved` é verdadeiro. Nos demais casos é usado o contrato determinístico de homologação. Erro do agente cai no contrato determinístico.
- Contexto do agente inclui somente nome/segmento já registrados no CRM e últimas mensagens pertinentes. Respostas de modelo passam novamente pelo guard de escopo. `requiresReview` gera encaminhamento humano e não envia o texto gerado. Condições financeiras e revisão técnica não criam escopo, pagamento ou contrato.

## CRM e transferência

Interesse explícito, dúvida técnica, pedido de humano, comprovante ou resposta pendente de revisão geram handoff. Somente entrada legítima de WhatsApp pode iniciar essa operação; pesquisa de empresas não cria lead interessado.

O orquestrador procura cliente pelo telefone normalizado e reutiliza oportunidade ativa de sites. Duplicidade ambígua exige revisão. Se necessário, usa os planejadores existentes `planCreateClient`/`planCreateOpportunity`, com chaves determinísticas e snapshot `beforeWrite` antes da mutação. Nome/empresa ainda não informados não são inventados: o registro privado identifica provisoriamente o contato recebido pelo WhatsApp. Nenhuma tabela financeira é escrita.

Handoff gera tarefa no `next_action` da oportunidade e histórico comercial imediatamente. O e-mail só é enfileirado com destinatário e origem privada do CRM configurados/verificados. Sem esses campos, a pendência continua no CRM. `reconcileHandoffs({limit})`, também executado por `flushOutbox`, enfileira os avisos quando a configuração passa a existir. Chaves determinísticas evitam duplicar notificações em uma retomada.

## Saídas

`flushOutbox({limit=10})` revalida conta, conversa, opt-out, consentimento/janela, template, calendário e política antes de chamar um transporte. Texto desconhecido sem guard ou template aprovado permanece bloqueado. Pix exige o hook explícito `beforeSend` do serviço de fechamento; o hook é executado imediatamente antes do adaptador. O orquestrador não aprova condições por conta própria.

Cada envio de WhatsApp usa o mesmo bloqueio exclusivo da conversa que o processamento da inbox. Se outro worker ocupa a conversa, a saída permanece pendente sem tentativa nem incerteza. Depois de adquirir o bloqueio, o worker prepara a saída; somente após o hook final, com a revisão da conta e o bloqueio ainda válidos, a transição atômica para `sending` consome a tentativa e inicia o lease do envio. Dois flushes não podem enviar simultaneamente para o mesmo destinatário. Preparação expirada volta a pendente; envio expirado continua incerto e sem replay. O timeout do transporte deve ser inferior ao lease de envio de sessenta segundos.

`dryRun:true` encerra as tentativas como `simulated` e não chama os transportes. `sent` só é usado quando o adaptador retorna `status:'accepted'` e `providerId`; isso não comprova entrega/leitura. Atualizações posteriores de entrega ficam na inbox e no histórico do CRM, separadas da aceitação.

Inbox, outbox e janela preservam origem real/simulada. O e-mail herda a origem da entrada que gerou o handoff. Mudar o modo não libera mensagens/e-mails de simulação; o contexto LLM real também exclui simulações. Recibo aceito depois de tomada humana fica preservado como incerto, sem replay. A política limita respostas de serviço a vinte saídas por destinatário/hora para a mesma origem.

Rede real exige conta fora de dry-run e `liveNetworkApproved:true`, além das aprovações, credenciais, allowlists e reservas de orçamento exigidas pelo próprio adaptador. A configuração privada não substitui esse gate de ambiente.

Primeira abordagem proativa usa a conta persistente, o teto global atômico de dez e reserva antes da tentativa. Respostas de serviço não consomem essa cota. Uma reserva já existente não é reutilizada como permissão de reenvio automático de primeira abordagem; exige reconciliação. Rejeições comprovadamente repetíveis de mensagens de serviço/e-mail podem usar backoff; timeouts e resultados incertos nunca repetem automaticamente.

O pedido de humano pode receber um único reconhecimento elegível e depois pausa a conversa. Pausa/opt-out durante a preparação cancelam a saída sem consumir tentativa; inclusive se acontecerem dentro do hook final, a transição para envio é recusada. Quando o despacho já começou, invalidam o lease e mantêm o resultado incerto, impedindo repetição; não é possível desfazer uma chamada já iniciada externamente. Toda chamada deve continuar usando os gates imediatamente antes do transporte.

## Evidências e limites

`node qa/prospecting/orchestrator.mjs` exercita SQLite real com adaptadores fictícios: defaults/kill-switch, janela original, conversa sem lead prematuro, criação/reuso do CRM, handoff imediato, e-mail pendente/configuração posterior, dry-run separado, guard contra promessas, bloqueio de Pix sem aprovação, incerteza sem replay, status de provedor e teto global de dez. As regressões mantêm uma conversa ocupada por oito processamentos, disputam dois envios ao mesmo telefone entre flushes concorrentes e fazem takeover dentro do hook anterior ao provedor, conferindo tentativas, estados e número de chamadas. Os testes conferem que contratos/pagamentos não mudam.

Nenhum desses testes confirma Meta, e-mail ou IA reais. A autorização de rede, validação do número/coexistência, custos, destinatário, QA da LP e ativação permanecem decisões verificadas no ambiente apropriado. Contadores do retorno diferenciam `sent`, `simulated`, `blocked`, `failed`, `uncertain` e falha de auditoria posterior (`auditPending`).
