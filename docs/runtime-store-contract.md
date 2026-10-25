# Persistência do atendimento comercial

`RuntimeStore` em `lib/prospecting/runtime-store.mjs` recebe um binding D1 com `prepare().bind().first()/all()/run()` e `batch()` transacional. Não contém chamadas externas, credenciais, confirmação de pagamento ou criação automática de contratos.

## Conta e configurações

- `configureAccount(owner, {account, revision?, dryRun?, killSwitch?, config?}, now)` cria a conta com `dryRun:true`, `killSwitch:true`. Conta é única globalmente; não pode ser compartilhada por proprietários nem trocada depois de criada. Para editar, exige a revisão atual. `account(owner)` retorna os booleanos normalizados, configurações e revisão.
- `config` aceita somente `ownerEmail`, `ownerEmailVerified`, `crmOrigin`, `research`, `calendar`, `testRecipients`, `providerMode`, `liveApproved`, `webhookVerified`, `waQuality`, `approvedTemplates`, `budgets`, `activationRef`. Nomes de credenciais/chaves/segredos são rejeitados recursivamente. As credenciais pertencem exclusivamente a secrets do ambiente.
- Configurações são dados de um serviço protegido. O chamador deve aplicar RBAC, proteção de origem e snapshot da proteção existente antes de uma alteração real. As validações da classe não substituem autenticação.

## Consentimento e conversa

- `setConsent(owner, phone, {channel:'whatsapp', brand:'Math Brands', purpose:'sites', evidence, grantedAt, expiresAt?}, now)` registra aceite explícito. Impede data futura e aceite anterior à revogação. Telefone encontrado não é consentimento. `consent` retorna os campos usados pela política de contato.
- `ensureConversation(owner, phone, {opportunityId?}, now)` cria a conversa e só vincula oportunidade não arquivada do mesmo proprietário. Um vínculo existente não é substituído por inferência. `conversation` retorna campos persistentes e aliases `lastInbound`, `opportunityId`, `paused`, `optedOut`.
- `claimConversation(owner, phone, token, now, ttlMs=60000)` e `releaseConversation(owner, phone, token)` dão exclusividade temporária ao processamento e envio de WhatsApp. Uma saída `sending` com lease vigente impede nova claim da conversa mesmo se o lock de preparação já venceu. `conversationLeaseCurrent` precisa ser conferido antes de emitir qualquer mensagem.
- `takeover(owner, phone, actor, now)` exige ator proprietário, pausa a conversa, invalida lock e cancela saídas pendentes ou em `preparing`. Somente envios que chegaram a `sending` viram `uncertain`, nunca são reenviados automaticamente.
- `optOut(owner, phone, now)` registra revogação/tombstone mesmo se nunca existiu opt-in; pausa e invalida saídas. `resume(owner, phone, actor, now)` é explícito e exige novo aceite posterior à revogação se houve opt-out. Nova mensagem recebida não retoma o bot sozinha.

## Inbox

`ingestInbox(owner, {eventId, recipient, kind, payload, sourceMode, simulated}, now)` aceita `message`, `status`, `human_echo` e deduplica por conta/evento. Origem omitida fica `unverified`/simulada; dry-run sempre grava `simulation`. Para `message`, `payload.at` é obrigatório: timestamp original normalizado, válido e não futuro. `lastInbound` usa somente `last_real_inbound`; `lastSimulatedInbound` é separado. Mudar o modo não converte histórico fictício em janela real. `status` não abre janela.

Eco humano e pausa/cancelamento são aplicados no mesmo batch da entrada. A reentrega do mesmo eco não pausa novamente uma conversa que o proprietário retomou explicitamente depois. O chamador deve verificar a assinatura e o vínculo com a conta antes de confiar em `human_echo`.

`claimInbox(owner, eventId, token, now, ttlMs)` retorna a entrada com payload parseado ou `null`. Leases vencidas permitem recuperar processamento. `finishInbox(owner, eventId, token, {state:'complete'|'failed', errorCode?}, now)` exige o mesmo token. Cinco falhas levam a `dlq`; erro é código enumerável sem telefone ou corpo no log. `inbox(owner,eventId)` lê o registro privado.

`deferInbox(owner, eventId, token, now)` devolve uma claim ainda em `processing` para `pending`, remove somente a tentativa da claim atual e libera seu token. É usado exclusivamente quando a conversa está ocupada, antes do processamento da mensagem. Não registra falha nem move para DLQ; token antigo não pode devolver a claim de outro worker. As falhas reais anteriores continuam contabilizadas.

## Outbox

`enqueueOutbox(owner, {key, recipient, channel:'whatsapp'|'email', payload, sourceMode, simulated}, now)` é idempotente e rejeita reutilização da chave com conteúdo/origem diferente. WhatsApp exige conversa não pausada e sem opt-out. Em modo real a claim exige `source_mode='real' AND simulated=0`; saídas simuladas/desconhecidas não são promovidas. O orquestrador valida consentimento, janela, template, calendário, limites, orçamento, conteúdo e ativação.

`claimOutbox(owner, key, token, now, ttlMs)` exige kill-switch desligado e dá exclusividade em `preparing`, sem consumir tentativa. Para WhatsApp, exige uma claim vigente da conversa com o mesmo token. Contenção na conversa mantém a saída pendente e não cria resultado incerto. `outboxLeaseCurrent` confere conta, pausa e tokens da saída/conversa.

`beginOutboxDispatch(owner, key, token, {accountRevision}, now)` é a transição atômica de `preparing` para `sending`. Revalida token, validade da preparação, revisão/kill-switch da conta, origem e lock/pausa/opt-out da conversa. Só essa transição incrementa tentativas; deve ocorrer depois de todos os hooks e imediatamente antes da chamada do adaptador, sem outro trabalho assíncrono entre a transição e a chamada. Inicia um lease de envio de sessenta segundos; os transportes oficiais têm timeout máximo de trinta segundos. Dry-run continua indicado na conta; a classe não o converte em autorização de rede. O orquestrador encerra uma simulação em `simulated` sem chamar `beginOutboxDispatch` ou transportes.

`finishOutbox(owner, key, token, {state, providerId?, errorCode?, retryAfterMs?}, now)` aceita `sent`, `simulated`, `uncertain`, `failed` ou `dlq`. `sent` exige estado `sending` e recibo/id do provedor; significa somente aceitação do envio, nunca entrega/leitura. `uncertain` também exige que o envio tenha começado. De `preparing` só são permitidos `simulated`, `failed` e `dlq`, sem incrementar tentativas. `simulated` identifica uma simulação local distinta de envio aceito pelo provedor. Falha conhecida permite no máximo três tentativas de envio com backoff; a terceira falha vira `dlq`. O orquestrador só deve classificar como `failed` uma rejeição comprovadamente segura para repetir. Timeout, resposta ambígua e expiração durante `sending` viram `uncertain`.

`reconcileExpiredOutbox(owner,now)` devolve preparações expiradas a `pending`, mantendo o número de tentativas, e torna envios expirados incertos. Não há operação automática que transforme `uncertain` em tentativa nova. Reconciliação com o provedor é necessária antes de intervenção manual. `outbox(owner,key)` retorna payload privado parseado. Não registrar destinatário/payload em logs públicos.

## Handoff e indicadores

`createHandoff(owner, {opportunityId, eventId, summary, nextAction?}, now)` usa a oportunidade do CRM existente. No mesmo batch, insere a pendência idempotente, atualiza somente `next_action`/revisão/data da oportunidade e cria histórico comercial. O e-mail é uma operação separada: a pendência não se torna concluída por ter sido enfileirada.

`summary(owner)` retorna conta, contagens por estado do inbox/outbox, total de conversas/pausas/opt-outs e handoffs pendentes. Não lê tabelas financeiras. O chamador protege esses dados com as permissões existentes do CRM.

## Provas e limites

`node qa/prospecting/runtime.mjs` aplica todas as migrações em SQLite real em memória e verifica defaults, conta global, revisão, rejeição de segredos, consentimento/revogação, timestamp de evento, status sem abrir janela, locks e tokens antigos, inbox/echo idempotentes, adiamento sem tentativas, recuperação de preparação expirada, envio protegido após expiração do lock de preparação, takeover, cancelamento, tentativas incertas sem replay, DLQ por falhas reais, recibo obrigatório, handoff único e dados financeiros idênticos antes/depois.

Sem prova de conexão Meta/D1 de produção, entrega de e-mail, cron publicado ou leitura humana. O estado persistente deve ser homologado com os adaptadores e o orquestrador antes de qualquer ativação real. Retenção e descarte precisam de política aprovada; esta entrega não exclui dados existentes.
