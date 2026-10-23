# IA comercial com custo zero

O atendimento pode usar o plano gratuito do Cloudflare Workers AI, exclusivamente com `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. O modelo tem suporte a português e consta na lista oficial de JSON Mode. A escolha ainda exige homologação da qualidade das respostas comerciais. Não há troca automática para outro modelo ou fornecedor.

Fontes: [modelo hospedado](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/), [model card da Meta](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/MODEL_CARD.md), [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/).

## Limite gratuito e interrupção

Na documentação consultada em 22/10/2026, o plano Free oferece 10.000 neurons por dia, renovados às 00h UTC. Ao atingir o limite, novas operações falham. O uso acima da franquia exige plano pago ou créditos. A configuração prevista permanece no Free, sem cartão, créditos ou contratação paga. O fornecedor pode alterar as condições; a operação deve parar se a gratuidade não puder ser novamente confirmada. Não existe promessa de gratuidade perpétua do serviço de terceiros.

O limite inicial da aplicação é de **20 tentativas de inferência por dia**, contabilizadas no controle global persistente antes da requisição, inclusive tentativas que falharem. Cada requisição aceita no máximo 8.000 bytes de JSON em UTF-8, incluindo instruções, schema e histórico, e solicita no máximo 500 tokens de saída. O histórico deve ser compacto. A folga da franquia depende do consumo total da conta e dos tokens efetivamente processados; uma contagem local de mensagens não prova saldo no fornecedor. Ao esgotar qualquer orçamento ou quota, permanece a resposta determinística ou o encaminhamento ao responsável. Não há tentativa automática adicional nem alternativa paga.

Fontes: [franquia, bloqueio e preços por modelo](https://developers.cloudflare.com/workers-ai/platform/pricing/), [início sem cartão](https://www.cloudflare.com/products/workers-ai/).

## Configuração privada e contrato de integração

`createCloudflareCommercialAgent(config, deps)` retorna o mesmo contrato do agente comercial: `respond` e `draftApproach`. A configuração privada requer `accountId` com 32 caracteres hexadecimais, `apiToken`, `enabled: true`, `approved: true`, `approvalRef`, `costMode: 'free_only'`, `estimatedCostMicros: 0`, `freePlanVerified: true` e `freePlanReviewThrough` como data ISO ainda válida. O controle compartilhado de fornecedores impõe a revisão e a reserva do orçamento. Sem esses requisitos, a chamada externa fica bloqueada. As credenciais nunca seguem ao navegador ou aos documentos públicos.

As dependências são `fetchImpl`, `reserveBudget` e `clock: () => ISO`, com relógio atual por padrão. O adaptador usa apenas o endpoint REST oficial da conta, com modelo fixo, sem ferramentas, Gateway, créditos ou rota alternativa. `max_tokens` é fixo em 500. Respostas com uso de saída superior ao teto são descartadas.

O ponto de extensão interno é `createCommercialAgent(config, {generatePlan})`: depois de limpar o contexto, o agente chama `generatePlan(context, {schema, instructions})`, que retorna `{plan, usage: {inputTokens, outputTokens}}`. Essa função pertence às dependências do servidor. Campos de JSON enviados pelo cliente não podem defini-la. O adaptador Cloudflare injeta sua própria função e não utiliza o caminho OpenAI.

O REST escolhido retorna `success`, `result.response` como objeto ou JSON em texto e, quando disponível, `result.usage`. O JSON passa pelas mesmas regras comerciais do agente. Plano inválido, erro de quota, conteúdo excessivo ou falha de transporte resultam em resposta determinística. JSON Mode não garante conformidade em todos os casos; não se executa o plano como ferramenta ou comando.

## Privacidade e revisão humana

Segundo a política atual, Cloudflare não usa o conteúdo do Workers AI para treinar modelos e não conserva entradas e saídas da inferência padrão além do necessário ao processamento. Há exceções legais e retenção quando se habilitam recursos com estado, logs ou cache. Não habilitar batch, armazenamento de conteúdo, logs de mensagens ou cache no Gateway para este fluxo.

O contexto é limitado aos campos esperados. E-mails e telefones reconhecíveis são ocultados na mensagem, histórico e dados de evidência enviados ao modelo. Isso não constitui anonimização completa de texto livre: nomes e descrições podem identificar pessoas. O aviso público de privacidade e a minimização dos dados continuam necessários. A resposta é validada e permanece sujeita a revisão humana. Valores, pagamento, contrato, escopo técnico e pedidos de interrupção continuam regidos pelas regras determinísticas.

Fontes: [uso dos dados](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [endpoint REST](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

Uma chamada originada no backend hospedado funciona com o computador do proprietário desligado. Isso depende de manter webhook, estado e tarefas no ambiente hospedado; o endpoint de IA, sozinho, não transfere um CRM local para a nuvem. [Visão geral da plataforma](https://developers.cloudflare.com/workers/).
