# Avisos privados de negócios confirmados

Este módulo prepara a notificação operacional ao proprietário pelo WhatsApp oficial. Não envia mensagens, não fecha negócios, não confirma pagamentos e não cria contratos. O destino interno é configuração privada distinta do número comercial público; nenhum telefone real integra o código ou as fixtures.

## Configuração e template

Defaults: `ownerNotificationsEnabled:false`. Para preparar uma fila elegível, o proprietário precisa configurar `ownerNotificationPhone`, `ownerNotificationVerified:true`, `ownerNotificationConsentRef`, `ownerNotificationsSince` (instante UTC explícito), `ownerNotificationTemplate:{name,language}` e incluir o mesmo nome em `approvedTemplates`. O template da conta Meta deve estar efetivamente aprovado para o aviso operacional, com dois parâmetros textuais no corpo: referência do contrato e URL privada da oportunidade. O código não inventa ou aprova um template na Meta.

O consentimento interno referencia o aceite do proprietário para seus avisos; ele não concede consentimento comercial a prospects. A data de ativação define uma fronteira estrita: não são enviados contratos criados antes ou exatamente nesse instante. Mudança de destinatário, consentimento ou template invalida o payload anterior; não há redirecionamento/reenvio automático. O operador deve revisar uma pendência antiga, preservando o ledger idempotente.

## Exports

- `ownerNotificationReadiness(config, now)` retorna `disabled`, `blocked` ou `ready`. A resposta pronta contém destinatário normalizado e metadados privados. Não publicar esse objeto em endpoint público.
- `reconcileOwnerNotifications({db,store,owner,clock,limit=10})` lê a configuração atual da conta do proprietário e enfileira no máximo cem registros por execução. Exige contrato ativo com status exato `Confirmado manualmente`, oportunidade `Fechado` e não arquivada do mesmo proprietário e evento financeiro `Contratação confirmada manualmente`/`contract_create`. Tanto o contrato quanto a confirmação devem ser posteriores à ativação e não futuros. Importações `Confirmado na planilha` são excluídas. Contratos já enfileirados não ocupam a página de novos avisos.
- `validateOwnerNotification({db,store,owner,row,clock})` é gate obrigatório imediatamente antes do transporte e retorna `{allowed,reason}`. Relê conta, consentimento, template, contrato, oportunidade e prova de confirmação; confere destinatário, conta, proprietário, pausa/opt-out e o payload canônico completo. Simulação não se torna envio real depois de trocar o modo.

Chave durável da outbox: `owner-deal:<contractId>`. Payload: `kind:'owner_deal_notice'`, origem `crm_manual_confirmation`, `proactive:false`, referência do contrato/evento, link canônico do CRM privado e template aprovado. Não inclui nome, telefone, e-mail, documento ou resumo do cliente. O aviso descreve confirmação manual e não afirma recebimento de dinheiro.

O módulo chama somente `RuntimeStore.enqueueOutbox`. Em dry-run, a origem é `simulation`; no modo real, a origem é uma confirmação manual confiável do CRM. Não promove mensagens simuladas nem altera tabelas financeiras. O integrador ainda deve aplicar gate externo, orçamento, qualidade da conta, template aprovado, allowlist de testes, locks de conversa e todos os controles do adaptador oficial. É aviso interno e não nova abordagem de prospect; não consome a cota de dez prospects. Não tratá-lo como texto livre fora da janela de atendimento.

## Prova

`node qa/prospecting/owner-notifications.mjs` usa as migrações reais em SQLite, fixtures fictícias e zero rede. Verifica opt-in e template obrigatórios, ativação explícita, exclusão de histórico/importações/futuros, proprietário isolado, privacidade do conteúdo, idempotência, cancelamento/reclassificação antes do envio, mudanças de destino/consentimento, pausa humana, simulação sem promoção e tabelas financeiras idênticas antes/depois.

Integrado ao runtime: `flushOutbox` reconcilia confirmações manuais, aplica a política interna, mantém os locks de conversa/saída, revalida o aviso antes do despacho e usa o mesmo adaptador oficial/orçamento/allowlist. POST financeiro bem-sucedido aciona o processamento em segundo plano. A confirmação de um negócio continua sendo humana. Uma resposta ao número pessoal não cria lead do proprietário. Testes integrados provam dry-run sem chamadas, recibo mock, revogação anterior ao despacho e cota de prospecção intacta.

Entrega local não comprova template aprovado, entrega real ou ativação na hospedagem. Os destinos reais ficam somente na configuração privada, sem valores padrão no código.
