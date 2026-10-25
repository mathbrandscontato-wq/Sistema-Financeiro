# Avisos privados de negócios confirmados

Atualizado em 23/10/2026 para o requisito permanente de custo operacional R$0. Este módulo prepara a notificação operacional ao proprietário pelo WhatsApp oficial. O módulo apenas enfileira; o runtime só pode despachar depois de todos os controles. Não fecha negócios, confirma pagamentos ou cria contratos. O destino interno é configuração privada distinta do número comercial público; nenhum telefone real integra o código ou as fixtures.

## Configuração e janela gratuita

Defaults: `ownerNotificationsEnabled:false`. Para preparar uma fila elegível, o proprietário precisa configurar `ownerNotificationPhone`, `ownerNotificationVerified:true`, `ownerNotificationConsentRef` e `ownerNotificationsSince` (instante UTC explícito). A política operacional é `costPolicy:'free_only'`, com orçamento monetário zero e plano gratuito vigente.

Nesse modo, o aviso contém somente texto e não inclui template. O envio exige uma mensagem **real recebida do proprietário** há menos de 23h58min: a aplicação desconta dois minutos da janela oficial de 24 horas como margem para o transporte. Mensagem simulada, tarefa do CRM, contrato fechado ou simples consentimento não abrem essa janela. Sem recebimento real elegível, a saída fica `pending`, sem consumir tentativas de despacho. Uma nova entrada real pode torná-la elegível em execução posterior, desde que todos os demais controles continuem válidos. Não existe envio automático pago para contornar a janela. [Regra oficial das mensagens de atendimento](https://whatsappbusiness.com/products/platform-pricing/).

O encaminhamento ao responsável permanece no CRM, com tarefa/histórico e e-mail pelo plano gratuito homologado como canais independentes. A pendência de WhatsApp não deve ser apresentada como aviso entregue, nem como garantia de alerta imediato ao celular. A fila integrada de e-mail ainda precisa de homologação; o teste individual Resend recebido não a ativa.

O consentimento interno referencia o aceite do proprietário para seus avisos; ele não concede consentimento comercial a prospects. A data de ativação define uma fronteira estrita: não são enviados contratos criados antes ou exatamente nesse instante. Mudança de destinatário, consentimento ou conteúdo invalida o payload anterior; não há redirecionamento/reenvio automático. O operador deve revisar uma pendência antiga, preservando o ledger idempotente.

O suporte legado de biblioteca a `ownerNotificationTemplate`/`approvedTemplates` permanece para testes e compatibilidade. Ele não é um caminho operacional pago: o servidor gratuito bloqueia qualquer template antes do transporte, mesmo que aprovado na Meta.

## Exports

- `ownerNotificationReadiness(config, now)` retorna `disabled`, `blocked` ou `ready`. No modo gratuito, `ready` indica configuração completa, com motivo `owner_notice_free_window_required` e `template:null`; não comprova janela aberta ou entrega. A resposta contém destinatário normalizado e metadados privados. Não publicar esse objeto em endpoint público.
- `reconcileOwnerNotifications({db,store,owner,clock,limit=10})` lê a configuração atual da conta do proprietário e enfileira no máximo cem registros por execução. Exige contrato ativo com status exato `Confirmado manualmente`, oportunidade `Fechado` e não arquivada do mesmo proprietário e evento financeiro `Contratação confirmada manualmente`/`contract_create`. Tanto o contrato quanto a confirmação devem ser posteriores à ativação e não futuros. Importações `Confirmado na planilha` são excluídas. Contratos já enfileirados não ocupam a página de novos avisos.
- `validateOwnerNotification({db,store,owner,row,clock})` é gate obrigatório imediatamente antes do transporte e retorna `{allowed,reason}`. Relê conta, consentimento, política gratuita, conversa real, contrato, oportunidade e prova de confirmação; confere destinatário, conta, proprietário, pausa/opt-out e o payload canônico completo. Simulação não se torna envio real depois de trocar o modo.

Chave durável da outbox: `owner-deal:<contractId>`. Payload gratuito: `kind:'owner_deal_notice'`, origem `crm_manual_confirmation`, `proactive:false`, referência do contrato/evento, link canônico do CRM privado e texto, sem template. Não inclui nome, telefone, e-mail, documento ou resumo do cliente. O aviso descreve confirmação manual e não afirma recebimento de dinheiro.

O módulo chama somente `RuntimeStore.enqueueOutbox`. Em dry-run, a origem é `simulation`; no modo real, a origem é uma confirmação manual confiável do CRM. Não promove mensagens simuladas nem altera tabelas financeiras. O integrador ainda aplica gate externo, plano gratuito revisado, cotas globais, qualidade da conta, allowlist de testes, locks de conversa e controles do adaptador oficial. O recebimento real e a margem da janela são revalidados antes da reserva gratuita e do acesso à rede. É aviso interno e não nova abordagem de prospect; não consome a cota de dez prospects, mas consome a cota global Meta quando houver tentativa real autorizada. Ver [limites de custo zero](zero-cost-operation.md).

## Prova

`node qa/prospecting/owner-notifications.mjs` usa as migrações reais em SQLite, fixtures fictícias e zero rede. Verifica opt-in, ativação explícita, exclusão de histórico/importações/futuros, proprietário isolado, privacidade do conteúdo, idempotência, cancelamento/reclassificação antes do envio, mudanças de destino/consentimento, pausa humana, simulação sem promoção e tabelas financeiras idênticas antes/depois. O contrato legado de template também é exercitado; os testes do modo gratuito dispensam template, mantêm aviso fora da janela pendente com zero tentativas e só despacham pelo transporte fictício após registrar recebimento real elegível.

Integrado ao runtime: `flushOutbox` reconcilia confirmações manuais, aplica a política interna, mantém os locks de conversa/saída, revalida o aviso antes do despacho e usa o mesmo adaptador oficial/orçamento/allowlist. POST financeiro bem-sucedido aciona o processamento em segundo plano. A confirmação de um negócio continua sendo humana. Uma resposta ao número pessoal não cria lead do proprietário. Testes integrados provam dry-run sem chamadas, recibo mock, revogação anterior ao despacho e cota de prospecção intacta.

Entrega local não comprova janela de uma conversa real, entrega de WhatsApp ou ativação na hospedagem. Os destinos reais ficam somente na configuração privada, sem valores padrão no código. Não houve envio real de WhatsApp nesta homologação.
