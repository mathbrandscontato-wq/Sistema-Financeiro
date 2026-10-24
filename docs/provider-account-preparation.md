# Preparação das contas de provedores

Atualizado em 23/10/2026. Etapa: adaptação ao requisito permanente de custo operacional zero; fluxo operacional do CRM ainda não homologado. Os fatos de 22/10 foram preservados como histórico.

O custo operacional exigido é **R$0 de forma permanente**. O proprietário autorizou os termos/cadastros gratuitos Google e Resend, a criação das chaves Resend/OpenAI e, posteriormente, **um único teste de e-mail Resend** descrito abaixo. Essa autorização individual não libera envios adicionais, filas, campanhas, billing, cartão, plano pago, compra de créditos ou chamadas pagas. A autorização posterior para concluir o desenvolvimento preserva a condição financeira. Fontes oficiais descrevem possibilidades dos produtos; o estado efetivamente confirmado está registrado a seguir.

## Caminho operacional de custo zero — 23/10/2026

| Integração atual | Estado confirmado | Preparação restante |
| --- | --- | --- |
| Cloudflare Workers AI Free | Conta preexistente acessada com aceite autorizado; painel confirmou Workers Free US$0. Token somente AI Read/Edit em uma conta, expiração 30/10; duas inferências de textos fictícios retornaram encaminhamento humano válido. | Qualidade comercial e fluxo completo ainda pendentes. Chave apenas no ambiente privado; nenhum envio ou ativação. |
| Tavily Researcher Free | Cadastro e termos autorizados concluídos; Researcher Free com PAYGO Off e parada no limite. Chave **Development** separada, teto 620/mês. Uma consulta original real retornou cinco páginas e consumiu um crédito. | Revisão de persistência e rotina completa hospedada pendentes. Resultados não verificados e não persistidos nessa prova. |
| Resend Free | Conta e chave separada existentes; teste único entregue e recebido em 22/10, conforme histórico abaixo. | Remetente definitivo, fila/handoff e revisão gratuita vigente; `ownerEmailVerified:false` e avisos desligados. |
| Meta — respostas gratuitas | Transporte do webhook de teste e assinatura comprovados; nenhuma mensagem de WhatsApp enviada. | Renovação da credencial expirada, conversa/entrega, coexistência e tomada humana. Texto só em janela aberta por recebimento real, com margem de dois minutos; nenhum template operacional. |

O servidor usa somente Cloudflare/Tavily no caminho de IA/pesquisa e mantém `costPolicy:'free_only'`, `budgets:{limitMicros:0,estimates:{}}`. As credenciais históricas OpenAI/Google não são usadas nem servem como fallback. Cotas globais persistentes limitam tentativas mesmo quando falham, e a revisão privada dos planos vence em até 31 dias; orçamento monetário zero é obrigatório, não bloqueio geral. Ver [configuração e limites](zero-cost-operation.md).

Workers Free fornece 10.000 neurons/dia; esgotamento gera erro, sem upgrade automático da aplicação. Tavily Free informa 1.000 créditos/mês, sem cartão; chave Production exige plano pago ou PAYGO e está excluída. Deve-se usar somente chave Development, cujo limite publicado de 100 solicitações/minuto fica acima das 20/minuto impostas aqui. Não habilitar cobrança automática. [Cloudflare](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Tavily Free](https://www.tavily.com/pricing), [tipos de chave Tavily](https://docs.tavily.com/documentation/rate-limits).

## Histórico registrado em 22/10/2026

O proprietário informou inicialmente que as contas OpenAI API, Google Cloud/Places e Resend ainda precisavam ser preparadas. O avanço posterior revelou contas Resend e OpenAI preexistentes, concluiu a preparação inicial do Google Cloud e criou projeto/chave restrita para homologação OpenAI. O estado abaixo consolida as evidências confirmadas na sessão; a edição deste documento não fez nova verificação de login ou credenciais. Dados privados de login, identificadores e valores/prefixos de chaves não são publicados aqui.

| Integração | Estado observado/informado | Pendência imediata |
| --- | --- | --- |
| Google Cloud/Places | Cadastro Cloud concluído com o e-mail informado pelo proprietário, país Brasil, sem adesão a marketing. Projeto **Math Brands Homologacao** criado. O painel de Faturamento do projeto confirmou ausência de conta de faturamento e de vínculo. Nenhuma API ou chave Places criada; sem billing, trial ou cartão. | Manter o projeto sem faturamento e fora do caminho operacional. A pesquisa atual foi encaminhada ao Tavily Free, ainda sem homologação real. |
| Resend | Conta preexistente acessada com perfil Google básico; plano Free, zero domínios e excedentes desativados. Chave separada **Math Brands — Homologação Comercial**, `sending_access`, guardada no ambiente privado isolado. Após a preparação sem envios, um único teste explicitamente autorizado ao próprio e-mail da conta retornou HTTP 200; painel confirmou Sent/Delivered e o usuário confirmou recebimento na caixa de entrada. | Autenticação da chave e entrega desse teste confirmadas. Remetente definitivo com domínio próprio e fluxo CRM de fila/handoff continuam pendentes. `ownerEmailVerified` permanece **false**; os gates locais não foram ativados. |
| OpenAI API | Login concluído na conta existente, organização **Personal**, antes com **Default project**. Projeto **Math Brands Homologacao** criado e confirmado na seleção. Chave **Math Brands — Homologação Comercial** criada com autorização específica, estado Active/Restricted, armazenada somente no ambiente privado isolado. Painel confirmou crédito restante **US$ 0,00**, zero requests e Last used **Never**. | Registro histórico; o caminho operacional foi substituído por Cloudflare Free. Nenhuma chamada de API ou listagem de modelos foi realizada; plugin oficial não instalado e sem conexão confirmada. Não comprar créditos nem habilitar fallback. |

A autorização para os termos gratuitos Google e Resend foi recebida. As autorizações específicas das chaves Resend/OpenAI e do teste individual Resend também foram recebidas e executadas. Na OpenAI, foi acessada conta existente: não houve novo cadastro nem novos termos apresentados/aceitos. O login no navegador foi concluído independentemente do plugin, que permanece não instalado; instalação/conexão do plugin não deve ser confundida com acesso à Platform pelo navegador. O estado de homologação Meta é separado e não comprova prontidão destas três integrações.

## Google Cloud e Places — preparação histórica, sem uso operacional

Um projeto Google Cloud pode existir sem billing: a criação pelo Resource Manager não o vincula automaticamente a uma conta de cobrança. No Console, uma conta de billing existente pode ser associada automaticamente; por isso, a preparação deve confirmar expressamente que não ocorreu vínculo. É possível preparar identificação do projeto e configurações sem colocar Places em operação. [Criação de projetos](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects), [associação de billing](https://docs.cloud.google.com/billing/docs/how-to/modify-project).

No projeto **Math Brands Homologacao**, a ausência de conta de faturamento/vínculo foi comprovada no próprio painel de Faturamento. Não houve cadastro de cartão, início de trial, habilitação de Places ou criação de chave Places. A criação do projeto não conclui a integração de pesquisa.

Para usar Places API (New), o Google exige projeto com billing ativo, API habilitada e autenticação. Uma chave ou indicação de API habilitada, isoladamente, não comprova que o serviço esteja operacional sem billing. Com o orçamento atual, não concluir qualquer etapa que exija conta de cobrança ou meio de pagamento. [Configuração Places](https://developers.google.com/maps/documentation/places/web-service/get-api-key), [uso e cobrança](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing).

As franquias são mensais, por SKU, e não dispensam billing:

| Text Search (New) | Franquia gratuita publicada | Limite funcional relevante |
| --- | --- | --- |
| Essentials IDs Only | Ilimitada | Identificadores/referências; `places.name` é o nome do recurso, não o nome comercial. |
| Pro | 5.000 solicitações/mês | `places.displayName` e endereço acionam esta categoria. |
| Enterprise | 1.000 solicitações/mês | `places.websiteUri`, telefones ou horários acionam esta categoria. |

A máscara de campos define a categoria aplicável. Solicitar nome ou site não pode ser tratado como uma busca gratuita ilimitada de IDs. Franquia publicada não é garantia de fatura zero após ativar billing. [Tabela de preços](https://developers.google.com/maps/billing-and-pricing/pricing), [campos e SKUs de Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search#fieldmask).

O Free Trial do Google Cloud anuncia US$ 300 por 90 dias e ausência de cobrança durante o trial, mas exige método de pagamento válido e pode fazer uma autorização temporária. Portanto, não atende à condição de preparar sem cadastrar pagamento. Não iniciar o trial ou vincular billing nesta etapa. [Condições oficiais do Free Trial](https://docs.cloud.google.com/free/docs/free-cloud-features).

### Pesquisa web foi encaminhada ao Tavily Free

Places procura locais/estabelecimentos e retorna objetos `Place`; não substitui pesquisa de páginas na web. Nossas consultas originais incluem `site:`, operador documentado do Google Search. Não há contrato equivalente documentado no Places para executar essas consultas como pesquisa web. Não reescrever silenciosamente as consultas para fazê-las caber no Places. [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search), [operador `site:`](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site).

A adaptação atual implementa **Tavily Free** como fonte de busca web, conforme [contrato do adaptador](free-research.md). Conta, termos e transporte de uma consulta foram concluídos em 23/10; persistência e rotina operacional continuam pendentes. Places permanece fora do servidor operacional e sem billing. Nenhuma descoberta presume atividade comprovada, interesse ou consentimento de contato.

A Custom Search JSON API não atende a um cadastro novo: está fechada a novos clientes e a documentação indica transição dos clientes existentes até 1º de janeiro de 2027. Sua antiga franquia de cem consultas diárias não pode ser prometida à Math Brands como solução nova. [Aviso oficial Custom Search](https://developers.google.com/custom-search/v1/overview).

## Resend

O plano gratuito de e-mails transacionais é anunciado a **US$ 0/mês, sem cartão**. A documentação informa 3.000 e-mails/mês, cem/dia e até três domínios verificados. O dia da quota é UTC, com renovação à meia-noite UTC. Envios e recebimentos contam para o limite; destinatários adicionais em To/CC/BCC também são contabilizados. Não confundir essa franquia com autorização para realizar um teste ou campanha. [Produto e ausência de cartão](https://resend.com/products/transactional-emails), [quotas oficiais](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

O remetente de teste `onboarding@resend.dev` só permite enviar para o e-mail associado à própria conta Resend. Foi preparado sem envios na fase de cadastro/credencial e utilizado depois exclusivamente no teste autorizado abaixo. Outros destinatários exigem domínio próprio adicionado e verificado pelos registros DNS indicados pelo serviço, usando depois um remetente nesse domínio. Nenhuma alteração de DNS foi realizada nesta etapa. [Restrição do domínio de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

O login revelou um envio histórico de oito dias antes e a chave preexistente **Math Brands — Formulário de contato**. Ambos pertenciam à conta antes desta preparação; a chave existente foi preservada. Esse histórico não é um envio realizado nesta etapa nem prova de homologação do novo fluxo comercial.

Após autorização específica do proprietário, foi criada a chave separada **Math Brands — Homologação Comercial**, com permissão **`sending_access`**, em vez de acesso completo. A conta tinha zero domínios; **All domains** era a única opção disponível e foi a seleção utilizada. Essa chave é capaz de enviar: seu nome não a restringe tecnicamente a testes ou a um único destinatário. Restrições de remetente do serviço e os gates locais continuam necessários. [Gerenciamento de chaves](https://resend.com/docs/dashboard/api-keys/introduction), [permissões na criação da chave](https://resend.com/docs/api-reference/api-keys/create-api-key).

A credencial foi guardada somente no arquivo de ambiente privado do checkout isolado, fora do OneDrive e excluído do Git. Seu valor não consta deste documento. Na fase de preparação, não houve validação via API ou envio. Na fase posterior, a credencial autenticou o único envio autorizado descrito abaixo. `ownerEmailVerified` continua **false**, dry-run e pausa geral permanecem sem alteração, impedindo despacho das filas apesar de existir uma credencial capaz de envio. O orçamento monetário zero permanece obrigatório no novo modo gratuito e, isoladamente, não impede uma chamada gratuita devidamente homologada.

### Teste individual posterior autorizado

O proprietário autorizou expressamente **um** envio de `onboarding@resend.dev` para o próprio e-mail da conta, com assunto e corpo previamente aprovados. Foi realizado um único **POST para `https://api.resend.com/emails`**, com resposta **HTTP 200**. Isso confirmou autenticação real da credencial e aceitação da solicitação pelo Resend.

O detalhe do e-mail correspondente no painel Resend mostrou **Sent** e **Delivered** em **22/10/2026 às 19:34, horário de São Paulo**, com assunto e corpo coincidentes com os aprovados. O proprietário confirmou: **“Recebi na caixa de entrada”**. Assim, há confirmação de entrega do provedor e recebimento humano desse teste, além da aceitação HTTP. O endereço privado do destinatário e o identificador do recibo não são publicados.

Nenhum outro envio foi realizado nessa fase. O teste não criou contrato, lead ou oportunidade fictícios, não acionou fila/handoff do CRM e não alterou gates ou orçamento. A confirmação do destinatário nesse teste não mudou `ownerEmailVerified` e não representa integração operacional das filas.

Pendências: remetente definitivo com domínio próprio/DNS e homologação do fluxo CRM de fila e handoff. O teste individual comprovado não autoriza novos envios, campanhas ou ativação automática. A verificação de domínio, caso necessária no futuro, continua sendo etapa separada.

## OpenAI API — preparação histórica, sem uso operacional

O fluxo oficial utiliza uma chave de projeto para autenticar chamadas da aplicação. O plugin OpenAI Developers pode ajudar a conectar o Codex à OpenAI Platform e preparar a chave pelo fluxo apropriado; a documentação prevê uma etapa própria de conexão da Platform. Nesta sessão, o plugin foi sugerido e permanece não instalado, sem conexão confirmada; isso não impediu concluir o login no navegador e preparar o projeto/chave na Platform. [Developer quickstart](https://developers.openai.com/api/docs/quickstart), [plugin oficial](https://developers.openai.com/learn/developers-codex-plugin).

O login foi concluído na conta correta, previamente existente, e a organização **Personal** já possuía **Default project**. O novo projeto **Math Brands Homologacao** foi criado e confirmado como selecionado. Não houve novo cadastro OpenAI ou apresentação/aceite de novos termos. O painel informou **US$ 0,00 de crédito restante e zero requests**; não houve dinheiro adicionado, cartão ou compra de créditos. **Não há garantia registrada de créditos gratuitos.**

Após autorização específica do proprietário, foi criada a chave **Math Brands — Homologação Comercial**, estado **Active / Restricted**, com criação em **22/10/2026 às 22:28:28 UTC** e expiração em **29/10/2026 às 22:28:28 UTC**, sete dias depois. O painel confirmou os seguintes escopos; todos os demais recursos ficaram em **None**:

| Escopo confirmado | Permissão |
| --- | --- |
| `api.model.read` | Leitura de modelos |
| `model.read` | Leitura de modelos |
| `api.responses.write` | Escrita de Responses |
| `api.responses.read` | Leitura de Responses |

A credencial foi guardada somente no arquivo de ambiente privado do checkout isolado, fora do OneDrive e não versionado. A verificação local de presença/formato retornou somente um resultado booleano; não autenticou a chave contra a API. Seu valor, prefixo e identificadores não constam deste documento. O painel indicou **Last used: Never**. Nenhum GET de modelos, validação via API, geração de resposta ou outra chamada foi executado.

Na preparação de 22/10, modelo e `COMMERCIAL_AI_MODEL` ficaram ausentes, sem inferência. Após o requisito permanente de R$0, **não há etapa operacional OpenAI a concluir**: o servidor usa o modelo fixo do Cloudflare Free e ignora a credencial OpenAI. Não comprar créditos, ativar recarga, adicionar cobrança ou usar esse serviço como fallback. A chave histórica não habilita o agente nem substitui os gates locais.

## Critérios para avançar

1. Preservar as autorizações e os avanços já registrados: termos gratuitos Google/Resend autorizados, projeto Google sem faturamento, conta OpenAI existente acessada, projeto OpenAI criado e chaves Resend/OpenAI separadas autorizadas/criadas. Se surgir etapa de cartão, billing ou plano pago, interromper essa etapa e registrar a dependência.
2. Preservar a preparação gratuita Cloudflare/Tavily e a prova de transporte de 23/10, sem cartão, plano pago ou créditos. A revisão privada foi limitada a 29/10/2026 às 00h UTC. Homologar qualidade comercial, persistência, remetente definitivo e fluxo CRM Resend. Preservar a distinção entre teste individual recebido e filas; não marcar `ownerEmailVerified` por consequência daquele teste.
3. Preparar credenciais apenas pelo fluxo privado aprovado; nunca incluir senhas, tokens ou valores de chaves no Git, neste documento ou em mensagens. Nenhum arquivo de ambiente foi consultado para redigir esta entrega.
4. Manter integrações externas, pesquisa, campanhas, Pix e avisos reais desligados até a homologação específica. O plano gratuito não autoriza ativação automática de filas.
5. Homologar Tavily e a revisão de persistência mínima como dependências próprias. Não considerar projeto Places, QA fictícia ou mera criação da chave como conclusão das consultas reais. Não copiar snippets, conteúdo ou contatos retornados.
6. Manter pendentes a IA operacional, o calendário revisado, a verificação de coexistência aplicável e a homologação/ativação de produção. O teste de e-mail não conclui essas dependências.

Preparação de conta, teste individual e ativação operacional são etapas distintas. O histórico registra Google sem faturamento, Resend com chave separada e **um teste autorizado autenticado, entregue e recebido**, além de OpenAI com projeto/chave restrita sem uso. Em 23/10, após aprovações específicas dos termos e credenciais, foram confirmados os planos gratuitos Cloudflare/Tavily e seus transportes reais, exclusivamente com textos fictícios e uma busca pública. A chave Tavily foi nomeada **Math Brands Homologacao** devido ao limite de caracteres do serviço; seu teto mensal é 620 e a chave default criada pelo cadastro foi preservada, sem uso. O token Cloudflare ficou em uma única conta, somente Workers AI Read/Edit, até 30/10. Segredos ficaram fora de Git/OneDrive e os gates de envio permaneceram falsos. Não confirma qualidade comercial, fila/handoff do CRM, persistência dos resultados, coexistência, agendamento hospedado ou ativação operacional. Ver [provas e limites](zero-cost-operation.md).
