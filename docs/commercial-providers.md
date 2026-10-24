# Contratos de provedores comerciais

Estado: adaptadores implementados e testados por fetch injetado, sem chamadas reais, contratação de serviços ou conexão do número comercial. Credenciais não foram procuradas em arquivos. A ferramenta de provisionamento de chave OpenAI não está disponível nesta sessão. Nenhum modelo foi escolhido por suposição.

## Configuração comum

`createMetaWhatsAppProvider`, `createGooglePlacesProvider`, `createResendProvider` e `createCommercialAgent` recebem configuração e dependências `{fetchImpl, reserveBudget}`. O fetch padrão é o da plataforma; os testes sempre injetam um substituto sem rede.

Toda chamada exige `enabled:true`, `approved:true`, `approvalRef`, `estimatedCostMicros` positivo e inteiro e um callback `reserveBudget({provider,costMicros})` que retorne exatamente `true`. O callback deve reservar custo atomicamente no banco antes da chamada, usando orçamento global aprovado; exceção ou ausência bloqueia a rede. A reserva permanece consumida quando a tentativa falha ou é incerta. `costMicros` representa a estimativa conservadora em **milionésimos de real (BRL)**, definida pelo operador a partir da tarifa/câmbio contratados; o código não inventa preços nem converte tarifas sozinho. Limites do fornecedor precisam ser configurados adicionalmente.

`timeoutMs` fica limitado a 100–30000 ms. Endpoints são fixos HTTPS, sem URL configurável e com redirects bloqueados. Erros têm somente código, status HTTP e flags `retryable`/`uncertain`; não contêm tokens, corpo, telefone, e-mail ou histórico. Timeout/falha de transporte após tentativa de envio marca incerteza. O chamador não deve reenviar WhatsApp cegamente.

## WhatsApp oficial

`createMetaWhatsAppProvider(config,deps)` exporta `send`, `sendText` e `sendTemplate`.

Configuração: `graphVersion` explícita, `phoneNumberId`, `accessToken`, campos comuns e `environment:'test'` com `testRecipients` normalizados. Não há versão Graph implícita. Fora de teste exige separadamente `environment:'production'`, `productionApproved:true` e `activationRef`; esses campos são configuração interna autorizada, nunca dados do cliente. Não foram ativados nesta entrega.

`send({recipient,text,template,policyDecision,signal})` exige `policyDecision:'allowed'` calculada pelo serviço confiável imediatamente antes da tentativa. Isso não substitui consentimentos persistentes, janela de 24h, template, qualidade, opt-out, limite global, takeover ou lock. Textos usam `preview_url:false`. Templates exigem `{approved:true,name,language,parameters?}`; só parâmetros de texto no corpo estão implementados. A aprovação do template deve vir do cadastro verificado da Meta, não da mensagem recebida.

Retorno `{status:'accepted',providerId}` significa aceitação pela API, nunca entrega ou leitura. O chamador persiste o ID e concilia webhooks.

`parseWhatsAppWebhook(payload,{phoneNumberId,wabaId,maxEvents})` só roda **depois** da verificação HMAC do corpo bruto e limite de tamanho. Filtra a conta, normaliza eventos inbound/status/human_echo com IDs distintos e ignora corpos desconhecidos. Texto recebido é dado não confiável; mídia/comprovante nunca confirma pagamento. Ecos `smb_message_echoes` pedem pausa humana, mas o formato e a disponibilização precisam ser homologados na conta real. A documentação direta Meta retornou 429 na sessão; o endpoint foi conferido na coleção oficial Meta/Postman. Não se afirma elegibilidade de coexistência ou compatibilidade dos dispositivos atuais.

Fontes primárias consultadas: [Meta — Messages](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages), [Meta — Send Text Message](https://www.postman.com/meta/whatsapp-business-platform/request/8gvd47s/send-text-message), [Meta — Received Text Message](https://www.postman.com/meta/whatsapp-business-platform/request/cy6hnq7/received-text-message). Referência pendente de acesso/homologação: [smb_message_echoes](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes).

## Pesquisa autorizada

`createGooglePlacesProvider(config,deps)` expõe `{id:'google_places',mode:'authorized',search(query,{signal,now,market})}`. Requer `apiKey` e os controles comuns. Faz uma página de Text Search (New), no máximo vinte resultados, com máscara restrita sem telefone/reviews. Não segue paginação automaticamente. Isso limita volume, mas custo depende dos campos/tarifa reais.

Resultados são **candidatos** score zero, sem consentimento e sem atividade confirmada. `publicId` é namespace Google/place ID; `profileUrl` e evidência apontam para a origem. O resultado inclui `persistenceAllowed:false` e `retentionPolicy:'provider_terms_review_required'`: o serviço não pode gravar o conteúdo retornado como cadastro permanente sem verificar restrições de armazenamento/atribuição e obter evidências independentes permitidas. Place ID tem tratamento próprio conforme política do fornecedor. Não armazenar nomes, endereços ou outros conteúdos Google indefinidamente por conveniência.

Places não é Google SERP. Operadores `site:` são rejeitados antes da cobrança; as consultas-base originais continuam intactas na biblioteca. As pesquisas de perfis/Instagram/LinkedIn precisam de um fornecedor de busca web compatível e aprovado. Não há scraping, evasão ou extração de telefone.

Fonte primária: [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search), que descreve POST, `textQuery`, field mask e condições de uso. Homologar também [políticas de Places](https://developers.google.com/maps/documentation/places/web-service/policies) antes de persistir conteúdo ou publicar atribuição.

## Avisos por e-mail

`createResendProvider(config,deps).send({to,subject,text,idempotencyKey,signal})` requer `apiKey`, `from` validado, campos comuns e os mesmos modos de teste/produção. Em teste somente `testRecipients` recebe chamadas. Destinatário do proprietário e domínio remetente precisam ser aprovados; nenhum endereço é inferido de contato público.

`Idempotency-Key` é obrigatório. Resend conserva a chave por 24 horas; por isso a outbox local precisa manter idempotência durável e não repetir um aviso incerto após esse período. `accepted` não significa e-mail entregue. Notificação pendente continua pendente até os marcos efetivamente conciliados. Não há anexos de comprovantes ou histórico integral no adaptador.

Fontes: [Send Email](https://resend.com/docs/api-reference/emails/send-email), [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys). O adaptador não cria conta, domínio ou assinatura paga.

## Agente consultivo

`createCommercialAgent(config,deps)` expõe `respond({message,company,history,paused})` e `draftApproach({company,objective})`. Requer `model` configurado explicitamente e `apiKey`; não há modelo padrão ou seleção de tarifa. Desligado usa `consult` determinístico.

As condições monetárias, Pix, comprovantes, intenção explícita, recusa e questões técnicas seguem decisões determinísticas; não dependem de prosa gerada. A chamada Responses usa `store:false`, zero ferramentas, limite de saída, `text.format` JSON Schema estrito e tratamento de refusal/incomplete. Envia apenas campos selecionados, até oito fatos revisados e oito trechos de histórico, com remoção básica de e-mail/identificadores longos. Revisão de privacidade e retenção continua necessária; `store:false` não é declaração de Zero Data Retention contratual.

Saída validada não pode conter novos valores, promessas de escopo/tecnologia/prazo, Pix ou garantias. Saída inválida retorna texto seguro de encaminhamento. O filtro é uma camada defensiva, não comprovação semântica de toda afirmação. **Toda prosa gerada pelo modelo** carrega `requiresReview:true` e vira rascunho privado para humano, nunca texto automático de WhatsApp nesta primeira homologação. As respostas determinísticas conhecidas continuam disponíveis; não se declara autonomia plena da IA. IDs de evidência devem pertencer aos fatos fornecidos.

`draftApproach` exige fato revisado com fonte/data, devolve rascunho marcado `requiresHumanReview` e `requiresConsent`. A abertura referencia literalmente esse fato e exige revisão antes de envio. No modo offline não finge ter gerado uma mensagem personalizada: devolve `reply:null` e o contexto factual para preparação. Rascunho não autoriza contato nem consome cota de destinatário.

Fontes OpenAI: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses). Nenhuma requisição OpenAI real foi feita.

## Prova executável

`node qa/prospecting/providers.mjs` valida payloads Meta/Google/Resend/Responses, orçamento negado, allowlists, erro sem segredo, IDs de eventos, contexto não verificado, política financeira, saída técnica adversarial e ausência de rede real. As versões/modelos/números no teste são valores fictícios e não recomendações de configuração.
