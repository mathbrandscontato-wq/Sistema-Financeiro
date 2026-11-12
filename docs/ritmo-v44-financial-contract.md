# Financeiro ↔ Ritmo V4.4 — ponte contratual (modo leitura, homologação)

Implementação isolada, desabilitada por padrão. Nenhum checkout foi criado e nenhum recebimento foi alterado.

## Propriedade dos dados

O Sistema Financeiro continua como fonte oficial de cliente comercial, proposta, contrato, valor, sinal, quitação e estorno. Ritmo mantém projetos, capacidade, reservas e aprovações.

## GET assinado

`GET /api/ritmo-v44/contract?v=2026-11-v1&organizationId=ORG&contractId=ID`

A rota só funciona com quatro variáveis explicitamente configuradas no **ambiente correto**:
- `RITMO_V44_ENABLED=true`
- `RITMO_V44_SECRET` — chave aleatória forte, mínima de 32 bytes, guardada como secret;
- `RITMO_V44_ORGANIZATION_ID` — organização Ritmo mapeada para o proprietário financeiro;
- `INTAKE_OWNER` existente.

Deixar desativada até o pareamento real do proprietário com a organização Ritmo e uma API caller confiável.

Cabeçalhos assinados:

- `X-MB-Timestamp`: epoch segundos, validade ±300s;
- `X-MB-Signature`: `sha256=HEX` de HMAC-SHA256.
- Mensagem HMAC: `2026-11-v1\nGET\n<pathname+query>\n<timestamp>\n<body>` (quebras reais de linha).

O token de serviço Sites, se exigido pelo hosting, é **adicional** ao HMAC, nunca seu substituto.

## Projeção do contrato

O serviço consulta diretamente `commercial_contracts`, `commercial_opportunities` e `commercial_payments` sob o proprietário `INTAKE_OWNER`, sem copiar valores ao Ritmo. Retorna:

- `contractId` e `commercialClientId`.
- `status` de aprovação comercial.
- `serviceLabel` e `contractRevision`.
- `deposit` e `final`: `pending` ou `confirmed`, recibo que atingiu o limite, instante registrado e data declarada.

Apenas recebimentos de confirmação `Confirmado`, não estornados, pertencentes ao mesmo proprietário e contrato podem satisfazer condições. Sinal usa somente recebimentos `Sinal`. Quitação considera o total pago. Não há detecção de compensação Pix/Cartão por esta API: os registros são da operação financeira existente e continuam dependendo de sua forma original de conferência.

## Limites fundamentais

- **NÃO é um checkout.** A escolha do provedor e a conta real seguem não confirmadas; não inventar URL de pagamento ou cobrar alguém.
- **NÃO é um evento outbox/webhook.** É leitura autenticada, apta a ser usada por um reconciliador futuro. A confirmação de recebimentos externos atualmente existente continua exigindo conferência.
- **NÃO existe comprovação de autenticação Sites em runtime real.**
- Não houve configuração de segredo, migration, merge, publicação ou teste com valores reais.
- A chamada do Ritmo deve validar a assinatura da requisição, a resposta, o vínculo contrato-projeto, o cliente mapeado e guardar o hash do snapshot para conciliação antes de iniciar prazo ou converter reserva.
- O PR #5 referente à política de sinal é independente; este módulo não altera sua migration nem o percentual legado.

## Verificação

`node --test qa/ritmo-v44-contract.mjs` valida assinatura, adulteração, janela de replay, contrato aprovado, pagamento parcial, estorno, quitação e isolamento. Workflow GitHub Actions somente leitura.

**NO-GO para integração ativa:** falta validação da origem oficial de ambos os Sites, contrato aprovado, mapeamento ID/tenant, sistema de eventos/reconciliação, provedor de checkout e teste real de staging.
