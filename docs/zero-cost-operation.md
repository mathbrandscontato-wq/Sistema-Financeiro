# Operação comercial com custo zero

Atualizado em 23/10/2026. O requisito do proprietário é **custo operacional R$0 de forma permanente**. O servidor desta branch implementa essa restrição; a automação continua pausada e não está publicada. Os testes locais usam provedores fictícios. A etapa oficial posterior confirmou os planos gratuitos e realizou duas inferências com textos fictícios e uma pesquisa pública; isso comprova transporte, sem concluir qualidade comercial ou fluxo completo em produção.

## Regra obrigatória do servidor

Somente `costPolicy:'free_only'` com `budgets:{limitMicros:0,estimates:{}}` pode habilitar integrações. Estimativas adicionais são recusadas. O servidor não utiliza OpenAI API ou Google Places, mesmo se as credenciais históricas existirem, e não oferece fallback pago. Cloudflare tem modelo/endpoint fixos; Tavily usa busca básica fixa de um crédito. Não há upgrade, cartão, recarga, PAYGO ou compra de créditos automáticos.

R$0 é uma regra permanente da aplicação, não uma garantia sobre os planos de terceiros. Se uma franquia acabar ou a gratuidade não puder ser novamente comprovada, a operação externa deve parar. Atendimento determinístico e tarefas do CRM continuam disponíveis conforme os demais controles; não se troca para serviço pago. Publicação, serviços hospedados, cron e armazenamento também precisam caber em franquias gratuitas verificadas. O código local não comprova que isso já esteja configurado em nuvem.

## Serviços e cotas conservadoras

| Fornecedor | Uso permitido | Tentativas/minuto | Tentativas/dia UTC | Tentativas/mês UTC |
| --- | --- | ---: | ---: | ---: |
| Meta WhatsApp | Texto durante janela gratuita real | 10 | 100 | 3.000 |
| Resend Free | Avisos por e-mail, após homologação | 3 | 20 | 600 |
| Cloudflare Workers AI Free | Modelo fixo Llama 3.3 | 3 | 20 | 620 |
| Tavily Researcher Free | Search basic, chave Development | 20 | 20 | 620 |

Esses são tetos internos de `FREE_PROVIDER_LIMITS`, não saldo confirmado nem limites prometidos pelo fornecedor. A reserva é atômica e persistente, antes da rede, com custo monetário exatamente zero. As janelas de minuto, dia e mês são UTC e compartilhadas entre todos os proprietários do CRM para o mesmo fornecedor. Reiniciar a aplicação, mudar proprietário ou criar outro objeto de adaptador não reinicia as contagens. Tentativas com falha ou resposta incerta continuam consumidas; não há liberação otimista de saldo.

O consumo de outros aplicativos na mesma conta, inclusive o formulário preexistente, não aparece necessariamente neste ledger. É preciso conferir a franquia disponível no fornecedor e manter cobrança/excedentes desligados. Esgotar qualquer teto interno ou limite gratuito do fornecedor interrompe chamadas. Não apagar o ledger para liberar cota.

Workers Free informa 10.000 neurons/dia, renovados às 00h UTC; operações falham ao atingir o limite. O modelo fixo é `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, com corpo de até 8.000 bytes UTF-8 e até 500 tokens de saída. A contagem de tentativas não equivale a uma medição exata de neurons. A conta deve permanecer Free, sem créditos de AI Gateway. [Franquia oficial](https://developers.cloudflare.com/workers-ai/platform/pricing/), [contrato de IA](free-ai.md).

Tavily Free informa 1.000 créditos/mês, sem cartão. A aplicação fixa `basic`, desliga `auto_parameters` e exige `usage.credits === 1`; divergência interrompe o adaptador e tenta persistir a pausa da conta. Uma falha do banco impede garantir essa gravação; a instância permanece pausada e não tenta outra chamada. A gratuidade também depende do bloqueio de excedentes no próprio fornecedor. Somente chaves **Development** são admitidas na preparação: a documentação vincula chaves Production a plano pago ou PAYGO. O limite publicado Development de 100 solicitações/minuto supera o teto interno de 20. [Plano gratuito](https://www.tavily.com/pricing), [limites e tipos de chave](https://docs.tavily.com/documentation/rate-limits), [contrato de pesquisa](free-research.md).

Resend Free foi observado com 3.000 e-mails/mês e 100/dia, sem excedentes habilitados. Os limites internos são menores. O teste único de 22/10 comprovou entrega e recebimento; não homologou a fila do CRM, que permanece desligada. O remetente de teste só permite o destinatário da própria conta; o remetente definitivo depende de configuração apropriada. [Quotas oficiais](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [preparação e histórico](provider-account-preparation.md).

## WhatsApp e avisos ao responsável

A Meta informa que uma mensagem do usuário abre uma janela gratuita de atendimento de 24 horas, renovada a cada nova mensagem dele. A aplicação exige recebimento **real**, não futuro, e desconta dois minutos como margem: a última entrada deve ter menos de 23h58min. Conversas simuladas não abrem a janela real. [Preço oficial de atendimento](https://whatsappbusiness.com/products/platform-pricing/).

No caminho gratuito, todos os templates ficam bloqueados, inclusive os de avisos internos. Não se abre conversa automaticamente fora da janela, ainda que haja consentimento. A descoberta de uma empresa também não autoriza contato. O limite adicional original de dez novos destinatários/dia continua existindo e não concede permissão para envio.

Avisos de negócio confirmado ao telefone privado são texto sem template. Fora da janela do proprietário, ficam pendentes, sem consumir tentativas de despacho. O encaminhamento ao responsável usa tarefa/histórico no CRM e e-mail gratuito homologado como canais independentes; não promete alerta imediato de WhatsApp. Contrato confirmado continua exigindo ação humana auditada e não comprova dinheiro recebido. [Contrato dos avisos](owner-notifications.md).

## Pesquisa diária sem cobrança

As 90 consultas originais e o rodízio 60/25/15 foram preservados. Com teto diário 20, o plano contém até 12 consultas prioritárias, cinco de rotação e três de contexto aprovado. Sem contexto aprovado, são até 17 planejadas; não se inventam eventos/indicações para ocupar as vagas. Em 31 dias, os máximos de 527 ou 620 tentativas permanecem abaixo dos 1.000 créditos publicados, mas dependem da franquia ainda disponível e das cotas internas.

O agendamento pretendido continua 10h30 de São Paulo todos os dias, com contatos proativos sujeitos às regras originais e à restrição gratuita. Nenhum agendamento hospedado foi ativado. A duração das buscas e os limites do ambiente em nuvem precisam de prova real; planejamento de vagas não significa conclusão garantida de todas as consultas.

Após publicação e homologação específicas, webhook, banco e cron devem rodar na hospedagem gratuita verificada, sem depender do computador ou de um chat Codex aberto. Abrir o CRM em `127.0.0.1` ou testar o handler localmente não cumpre esse requisito de execução em nuvem.

Retornos Tavily são candidatos de páginas, sem atividade/localização/identidade empresarial verificadas, consentimento ou pontuação positiva. A persistência mínima de URL/título exige aprovação separada dos termos; começa bloqueada. Snippets, corpo de páginas, respostas e contatos retornados são removidos. A evidência técnica apenas registra que a URL veio da busca e permanece não revisada, sem alimentar fatos do agente.

## Revisão privada de gratuidade

Cada chamada exige `freePlanVerified:true`, referência de ativação e `freePlanReviewThrough` futura, no máximo 31 dias adiante. O servidor lê esses requisitos a partir de secrets privados; nunca de JSON enviado pelo cliente.

| Controle privado | Finalidade |
| --- | --- |
| `META_FREE_SERVICE_VERIFIED` | Gratuidade do atendimento Meta conferida |
| `RESEND_FREE_PLAN_VERIFIED` | Plano e ausência de excedentes Resend conferidos |
| `CLOUDFLARE_AI_FREE_PLAN_VERIFIED` | Workers Free, modelo e ausência de créditos pagos conferidos |
| `TAVILY_FREE_PLAN_VERIFIED` | Free, chave Development e ausência de PAYGO conferidos |
| `COMMERCIAL_FREE_PLAN_REVIEW_THROUGH` | Validade comum da revisão, em ISO UTC |
| `COMMERCIAL_ACTIVATION_REFERENCE` | Referência privada da aprovação e conferência |
| `TAVILY_METADATA_PERSISTENCE_APPROVED` | Liberação específica de persistência mínima, falsa por padrão |
| `TAVILY_METADATA_PERSISTENCE_APPROVAL_REFERENCE` | Referência da revisão específica de persistência |

As quatro flags exigem valor textual `true` para o respectivo fornecedor. Ausência, prazo vencido ou prazo superior a 31 dias impede a chamada. Renovar o prazo exige conferir novamente o plano, as condições e os consumos; não se deve avançar a data automaticamente para manter o sistema ligado.

Continuam obrigatórios os controles de dry-run/pausa, revisão da configuração, oferta R$500 com sinal contratual R$200, aprovação externa, qualidade da conta, propriedade confiável, consentimento aplicável, janela real, assinatura de webhook, allowlist de testes e homologação do canal. Esses requisitos são independentes da gratuidade. Uma conta gratuita preparada não ativa as filas.

## Persistência, prova e interrupção

As tentativas ficam em `prospecting_costs` com fornecedor `free:<provider>` e `cost_micros:0`. A migração aditiva **0015** cria somente o índice por fornecedor/data, sem alterar contratos, pagamentos ou movimentações. O snapshot privado versão 8 já inclui esse ledger no estado operacional de cada proprietário; não há nova versão de backup apenas por essa mudança. Não houve aplicação remota dessa migração.

Quando o próprio adaptador comprova bloqueio anterior ao HTTP por cota, plano ou janela, a saída volta a pendente, sem consumir tentativa de despacho; a cota já reservada nunca é devolvida. A retomada continua sujeita a todos os controles vigentes. Falhas de transporte ou aceitação incerta não usam essa recuperação e nunca são reenviadas cegamente. Após esse ajuste final, as dez suítes de runtime, TypeScript e build do framework foram revalidados.

Os testes locais cobrem provedores fictícios, corpo fixo, credenciais/configurações ausentes, revisão vencida, limites de entrada/saída, domínio/prefixo, persistência SQLite não revisada e ausência de fallback. A reserva concorrente usa quatro conexões SQLite e verifica reinício e horários fora de ordem. Avisos aguardando janela não ocupam o lote de e-mails/respostas elegíveis. Webhooks válidos acionam processamento após a resposta HTTP, com proteção prévia e filas idempotentes.

Na etapa oficial de 23/10, o painel confirmou Workers Free **US$0 / plano atual**, token somente Workers AI Read/Edit em uma conta e expiração em **30/10/2026**. Tavily confirmou **Researcher Free**, 1.000 créditos/mês, **Pay-as-you-go Off**, **Requests stop at the plan limit** e nenhuma fatura futura; a chave Development separada recebeu teto mensal 620. Os valores das credenciais ficaram apenas no ambiente privado não versionado, fora do OneDrive. Não houve cartão ou plano pago. A revisão privada foi limitada a **29/10/2026 às 00h UTC**, sem ativar os gates de envio.

Foram feitas duas inferências Cloudflare com mensagens fictícias, ambas retornando encaminhamento humano seguro, e uma busca Tavily de consulta original, com um crédito e cinco candidatos não verificados. Nenhum nome, URL ou conteúdo dos resultados foi persistido nessa prova. O primeiro teste esperava indevidamente modo `model`; a resposta válida escolheu `policy`. O critério foi corrigido, preservando o registro da chamada e sem repeti-la. Esses resultados comprovam autenticação, JSON e aplicação dos controles, sem homologar qualidade de atendimento, filas reais, coexistência ou cron. As provas Meta/Resend de 22/10 continuam separadas. Ver [prontidão e limites da homologação](commercial-production-readiness.md).

Em mudança de plano, consumo inesperado, gratuidade não comprovada ou revisão vencida, manter/ligar a pausa e desabilitar os gates externos e cron. Preservar contagens, consentimentos, pendências e recibos; conciliar saídas incertas antes de qualquer intervenção. A aplicação não pode transformar essa interrupção em cobrança.
