# Meta — resultado da homologação de transporte

Conferido em **22/10/2026**. O app **Math Brands Homologação** e o número de teste foram preparados com os aceites específicos do proprietário. O app permanece **Em desenvolvimento / Não publicado**. Não houve envio de WhatsApp, conexão do número comercial, contratação de plano pago ou publicação em produção.

## Ambiente e credenciais

O teste usou um checkout isolado em um worktree Git fora de OneDrive, com estado D1/R2 novo; nenhuma persistência anterior foi copiada. O aplicativo pode inserir suas referências locais padrão ao iniciar, portanto a base não deve ser descrita como totalmente vazia. A conta operacional foi vinculada ao Phone Number ID de teste desde o início. Não foi reaproveitada a conta fictícia dos testes anteriores.

O proprietário concluiu SMS, senha e autorizações diretamente na Meta. Token temporário, segredo do app e segredo de verificação foram guardados apenas em arquivo de ambiente privado excluído do versionamento; não integram o código, capturas públicas ou este relatório. O contato de autenticação não foi usado como destino comercial ou de avisos.

| Verificação | Resultado observado |
| --- | --- |
| Consulta de serviço ao Phone Number ID de teste | HTTP 200; ID correspondente, em 22/10 às 18h56 UTC |
| Inspeção do token | HTTP 200; válido e correspondente ao app, em 22/10 às 19h03 UTC |
| Validade informada | Até 22/10/2026 às 20h UTC, 17h de São Paulo |
| Escopos informados | `whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile` |
| Ativos granulares | Nenhum ID de destino retornado; exclusividade da credencial a ativos de teste não comprovada |
| Limite efetivo desta etapa | Configuração e chamadas vinculadas aos IDs de teste; outros ativos não consultados |

A validade acima é histórica, referente ao momento da inspeção. **O token daquela prova expirou às 20h UTC de 22/10/2026**, antes desta atualização das 22h31 UTC. Ele não deve ser descrito como válido atualmente. A retomada exige renovar a credencial e revisar as permissões antes de usá-la; não foi feita nova chamada para validar o token expirado.

## Recebimento do webhook

O proprietário autorizou uma URL HTTPS temporária, somente para `GET/POST /api/whatsapp`, e o recebimento de um evento de exemplo do painel da Meta. O gateway encaminhou apenas esse caminho ao servidor local, com limite de corpo de 128 KiB. Raiz e demais rotas responderam 404; `OPTIONS` respondeu 405.

Os testes do endpoint local, do gateway e da URL externa produziram os mesmos resultados:

| Caso | HTTP |
| --- | --- |
| Desafio com segredo de verificação correto | 200 |
| Desafio com segredo incorreto | 403 |
| Envelope vazio com assinatura válida | 200 |
| Assinatura inválida | 401 |

Esses envelopes vazios foram testes controlados e não são o exemplo real da Meta. Separadamente, a Meta verificou o callback, e uma consulta oficial confirmou uma única assinatura ativa: objeto `whatsapp_business_account`, campo **`messages`**, versão **`v26.0`**, callback correspondente. A interface ofereceu essa versão de webhook; o exemplo de chamada de serviço mostrou Graph **`v25.0`**, mantido no ambiente privado. As duas versões foram registradas separadamente.

Na opção **Teste** do campo `messages`, o exemplo de mensagem foi enviado pelo painel da Meta ao servidor. O servidor registrou **POST `/api/whatsapp` HTTP 200**. A assinatura real foi aceita. O exemplo usa Phone Number ID fictício `123456123`, diferente da conta de teste configurada, e foi ignorado pelo isolamento de conta. Permaneceram **zero eventos recebidos para processamento, conversas, inbox e outbox**. Não foi criado lead ou handoff a partir desse exemplo.

O resultado comprova **transporte e validação de assinatura**. Conversa completa, envio, entrega, template aprovado, tomada humana e coexistência com o atendimento atual ainda precisam de homologação. O portal informa que o app não publicado recebe os exemplos do painel; esta prova não demonstra recebimento operacional de dados de produção.

## Encerramento e estado preservado

A assinatura/callback foi removida ao terminar. A API respondeu HTTP 200 com **`subscriptions: []` em 22/10 às 19h21 UTC**. Túnel, gateway e servidor local foram encerrados. A URL externa anterior respondeu HTTP 530 após o encerramento. O app e os recursos de teste foram preservados em desenvolvimento.

Os controles locais permanecem:

| Controle | Valor |
| --- | --- |
| `dryRun` / `killSwitch` | `true` / `true` |
| Orçamento | Zero |
| Destinatários de teste | Nenhum |
| `liveApproved` / `webhookVerified` | `false` / `false` |
| Pesquisa / avisos ao proprietário | Desligados |
| Conversas / inbox / outbox | Zero / zero / zero |

O sucesso do transporte não alterou os gates de ativação. O orçamento externo continua **R$ 0**. Nenhuma chamada paga foi feita. Ao encerrar o teste da Meta, às **19h21 UTC**, a preparação das contas OpenAI API, Google Cloud/Places e Resend ainda constava como pendente. Esse é o estado histórico daquele encerramento. Nenhuma forma de pagamento foi cadastrada na etapa da Meta.

## Atualização posterior de contas

Registrada em **22/10/2026 às 22h31 UTC**, sem modificar os eventos da Meta acima. Este bloco é histórico e anterior ao teste de e-mail registrado em seguida:

- O cadastro Google Cloud foi concluído com os termos aprovados pelo proprietário. O projeto **Math Brands Homologacao** foi criado, e seu painel confirmou **sem conta de faturamento**. Não foram habilitada a API Places, criada chave ou iniciada avaliação gratuita.
- O login no Resend revelou uma conta preexistente **Free**, com **3.000 e-mails/mês, 100/dia e zero domínios**. A chave do formulário foi preservada. Com autorização específica, a chave **Math Brands — Homologação Comercial** foi criada com `sending_access`; **All domains** era a única opção da interface. Ela foi guardada somente em arquivo de ambiente privado não versionado, com remetente `onboarding@resend.dev`. A conferência privada confirmou presença/formato da chave e remetente de teste, sem imprimir segredos. Não houve envio ou validação pela API; o destinatário permanece não verificado.
- **OpenAI API:** o login confirmou a organização pessoal preexistente **Personal**, e o projeto separado **MathBrandsHomologacao** foi criado. O painel indicou **US$ 0,00 de crédito restante e zero solicitações**. Após autorização específica, a chave **Math Brands — Homologação Comercial** foi criada em **22/10/2026 às 22h28min28s UTC**, ativa e restrita, com expiração em **29/10/2026 às 22h28min28s UTC** e último uso **Never**. Os quatro escopos confirmados são `api.model.read`, `model.read`, `api.responses.write` e `api.responses.read`; as demais capacidades ficaram desabilitadas. A chave foi guardada somente no arquivo de ambiente privado não versionado, com presença/formato confirmados sem divulgar o valor. O modelo ainda não foi escolhido ou configurado. Não houve chamada de IA, compra de créditos, cadastro de cartão ou conexão de plugin; a preparação ocorreu pela interface oficial.

O domínio próprio permanece pendente para o remetente definitivo do Resend; o remetente `onboarding@resend.dev` permite apenas o teste para o e-mail da própria conta. Pesquisa e avisos permanecem desligados, com orçamento zero. Modelo e orçamento de IA ainda precisam de definição. Essa preparação, até as 22h31 UTC, não comprovava chamada de IA, entrega de e-mail ou pesquisa operacional. A entrega do teste posterior está registrada separadamente abaixo.

## E-mail — teste único autorizado em 22/10/2026

Atualizado às **22h35 UTC**. Após a preparação histórica das 22h31 UTC, o proprietário autorizou explicitamente **um e-mail para o endereço da própria conta Resend**, com assunto **Teste autorizado de homologação — Math Brands** e texto que identifica o teste, sem venda ou cliente.

O teste isolado fez **um único POST** à API do Resend, com proteção contra duplicidade e **zero retentativas**. A API respondeu **HTTP 200 / aceito**. O detalhe do e-mail na interface do Resend mostrou **Sent** e **Delivered**, em **22/10 às 19h34 de São Paulo**. Remetente de teste, assunto e corpo conferiram com o aprovado. O proprietário confirmou: **“Recebi na caixa de entrada”**. Portanto, o transporte desse e-mail de teste e o recebimento na caixa de entrada foram comprovados; o endereço e o recibo não são publicados neste relatório.

Não houve outro envio feito nesta homologação, chamada de IA, Places ou envio de WhatsApp. O teste não criou lead, contrato ou movimento financeiro. O orçamento permanece **R$ 0**, sem compra de plano ou alteração dos gates: a configuração **`ownerEmailVerified` continua `false`**, e os avisos permanecem desligados. A confirmação do transporte não ativa o fluxo do CRM. Ainda faltam o remetente definitivo com domínio verificado e a homologação da fila integrada de avisos do CRM.

## Evidência reproduzível e próximos passos

O relatório versionado [homologation-report.json](../qa/prospecting/homologation-report.json), em `nextStage.metaAudit.officialTestHomologation`, contém apenas resultados sanitizados das consultas de leitura, dos testes de endpoint, do estado pausado e da remoção da assinatura. As capturas locais ficam em `outputs/homologacao/`, excluídas do versionamento, com seções de credenciais recolhidas. Segredos e a URL temporária não fazem parte do relatório público.

Para uma nova sessão: revisar a credencial, reiniciar o ambiente privado, criar outro callback temporário somente mediante autorização aplicável e repetir a verificação. Conversa e entrega exigem destinatário de teste explicitamente permitido; número comercial, produção, campanhas e cobrança permanecem sujeitos aos gates e autorizações específicos descritos em [preparação de produção](commercial-production-readiness.md).

## Retomada em 23/10/2026 — confirmação de identidade pendente

Ao retomar o painel do aplicativo de homologação, a Meta exibiu **Confirmação de conta necessária**, mencionando atividade incomum na conta de desenvolvedor. O fluxo **Confirmar conta** abriu uma nova confirmação de identidade com duas opções de e-mail mascaradas. O proprietário precisa escolher seu contato correto e concluir a confirmação diretamente na Meta; não foi solicitado código, senha ou documento no chat. Essa exigência não comprova comprometimento da conta.

O token anterior continua expirado; nenhum novo token, assinatura de webhook, destinatário, mensagem, migração ou conexão do número real foi realizado nessa retomada. As provas de transporte de 22/10 permanecem históricas. A implementação de custo zero e a preparação/testes gratuitos Cloudflare/Tavily foram concluídos independentemente desse bloqueio; ver [prontidão](commercial-production-readiness.md).

## Confirmação concluída e acesso restaurado — 23/10/2026

O proprietário concluiu a confirmação diretamente na Meta. A página exibiu **Acesso restaurado ao Meta for Developers**; após o processamento, a lista de apps e o painel de **Math Brands Homologação** voltaram a abrir. O aplicativo continua em desenvolvimento e não publicado. A exigência de identidade registrada acima é histórica e não continua pendente do proprietário.

A página do caso de uso WhatsApp demorou a carregar e a primeira navegação automática não foi concluída. O proprietário confirmou que abriu **Etapa 1. Experimente**, e a preparação foi retomada na rota de testes. Não é uma nova exigência de identidade. A renovação da credencial temporária não foi concluída nesta conferência; o token de 22/10 permanece expirado. O checkout privado foi atualizado para a revisão de custo zero `bd22a5b`, preservando os arquivos ignorados e sem ativar gates, destinatários, callback, envio ou número real. A liberação do portal não comprova conversa, entrega ou coexistência.

## Credencial temporária renovada — 23/10/2026 às 21h47 UTC

Após a confirmação do proprietário de que o token apareceu na página, a credencial foi substituída somente no arquivo privado de homologação. Duas consultas de leitura retornaram **HTTP 200**: inspeção de validade/app e consulta do identificador do número de teste. O token corresponde ao app e está válido até **23/10/2026 às 23h UTC (20h de São Paulo)**. A validade é a observada nesta conferência e não deve ser estendida ou descrita como permanente.

Os escopos continuam `whatsapp_business_management`, `whatsapp_business_messaging` e `public_profile`, dentro da concessão anterior. A inspeção retornou zero IDs de ativos granulares; portanto, **não foi comprovada exclusividade da credencial aos ativos de teste**. Todas as chamadas desta etapa foram vinculadas explicitamente ao app e número de teste aprovados; outros ativos não foram consultados.

Nenhum destinatário foi adicionado, webhook reaberto, WhatsApp enviado, gate ativado ou número real conectado. Conversa, entrega e tomada humana reais continuam pendentes. A tela de credencial foi recolhida após a captura privada; o valor não integra o Git, recibos públicos ou capturas.

## Teste de conversa autorizado — 23/10/2026, falha 130497

O proprietário autorizou cadastrar seu telefone privado como único destinatário de teste, usar um callback restrito por até uma hora e enviar um `hello_world`, com até duas respostas de atendimento após sua resposta. Ele concluiu a verificação de cinco dígitos diretamente na Meta. A própria interface informa mensagens de teste gratuitas. O telefone e os códigos não integram o relatório versionado.

A revisão do catálogo confirmou `hello_world`, `en_US`, aprovado. A qualidade do número de teste retornou **UNKNOWN / CLOUD_API**, mantida como não homologada. O runtime privado continuou em dry-run/kill-switch, sem destinatário local e sem resposta automática. O remetente comercial real não foi conectado.

O callback temporário passou em desafio correto 200, incorreto 403, envelope vazio com HMAC válido 200 e inválido 401; raiz e rota privada do CRM retornaram 404, OPTIONS 405. A Meta verificou `whatsapp_business_account / messages / v26.0`, e a conta de teste foi assinada temporariamente.

Houve **uma tentativa de envio**, sem retentativa, às **19h02 de São Paulo**: HTTP 200 e ID de mensagem. O proprietário informou não ter recebido. O payload completo no painel da Meta mostrou **failed**, código **130497**, com o mesmo identificador do recibo privado. Isso comprova a falha de entrega, não uma conversa bem-sucedida. O erro informa restrição da conta para o país de destino. A [referência oficial](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes) direciona à elegibilidade dos países para a categoria da empresa; não foi presumida a causa específica da restrição.

O envio de bootstrap ocorreu fora da outbox do CRM, e seu status sem correspondência nessa fila é ignorado por desenho. O banco privado terminou com zero conversas, inbox e outbox; não se deve descrever esse teste como validação completa do fluxo do CRM. Não houve resposta automática, cliente, contrato ou pagamento criado.

O túnel encerrou automaticamente às **19h58**, e o processo privado foi confirmado parado. Callback e assinatura criados nesta sessão foram removidos e conferidos. Uma renovação equivalente de credencial foi usada somente para retirar a assinatura remanescente, sem novo envio; expirou em **24/10 às 01h de São Paulo**. A permissão do destinatário de teste foi preservada. O próximo passo é a revisão oficial da categoria/elegibilidade da conta. Nenhuma cobrança, cartão, campanha, migração, publicação ou contorno de restrição foi realizado.

## Suporte solicitado — 24/10/2026 às 07h17 de São Paulo

O proprietário autorizou enviar o relato e, separadamente, aceitar os Termos do Meta AI apresentados na etapa final. O formulário informa uso do conteúdo para suporte e melhoria da assistência automatizada, com acesso da equipe e prestadores da Meta. Após um único envio, a página confirmou o [protocolo 29067865726179250](https://business.facebook.com/direct-support/case-detail/29067865726179250/), status **Open**, no portfólio Math Brands.

O relato equivalente em inglês contém os identificadores do app, da conta e do número artificial, o horário da falha, `hello_world / en_US`, o erro 130497 e o resultado HTTP 200 seguido de falha assíncrona. Não inclui token, segredo, telefone privado ou anexo. Não promete contratar plano, adicionar cartão ou migrar o número real.

No canal Account & WABA, o seletor obrigatório não listou o número de teste, inclusive por identificador. Foi usado **Dev: Cloud API / Messages API and Webhook**, com a limitação descrita no próprio relato e solicitação de triagem ao time correto. A página oferece assistência Meta AI; o protocolo aberto não comprova revisão humana ou resolução. Não houve novo envio de WhatsApp, alteração de configurações operacionais ou reabertura do callback. O teste de entrega permanece reprovado e a automação pausada.

Foi tentado um pedido de revisão humana na conversa do mesmo protocolo, mas a interface não confirmou sua entrega. Após reabrir o chamado, o chat exibiu uma etapa adicional **Start using Meta AI**, com termos Beta e Suplementares distintos do aceite do formulário. Essa etapa não foi aceita nem o pedido repetido. O encaminhamento solicitado no corpo original está registrado; uma resposta ou revisão humana continua sem comprovação. O status do chamado permaneceu **Open** após recarregar a página.
