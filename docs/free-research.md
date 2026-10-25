# Pesquisa web com custo operacional zero

Fontes oficiais consultadas em 22 e 23/10/2026. A QA local usa respostas fictícias. Na etapa oficial posterior, cadastro/termos e chave Development foram autorizados, o painel confirmou Researcher Free com PAYGO Off e uma consulta original consumiu um crédito, retornando cinco páginas não verificadas sem persistência. Isso comprova transporte, sem ativar rotina ou aprovar armazenamento. Ver [preparação e limites](provider-account-preparation.md).

## Escolha e limite financeiro

A proposta é Tavily Researcher Free: 1.000 créditos mensais, sem cartão. O site informa renovação no primeiro dia do mês e interrupção quando os créditos gratuitos acabam. O preço opcional Pay As You Go é US$ 0,008/crédito; ele não faz parte desta implementação. Nenhum plano pago, cartão, recarga ou fallback deve ser habilitado. A existência atual do plano gratuito não garante sua continuidade: mudança de condições ou revisão vencida interrompe o uso. [Preço e perguntas oficiais](https://www.tavily.com/pricing).

A aplicação reserva, de forma atômica e persistente, uma tentativa antes de cada chamada: máximo de 20/minuto, 20/dia e 620/mês na conta compartilhada, sem reiniciar limites por proprietário. A janela UTC é uma regra conservadora da aplicação; a página de preços não especifica o fuso da renovação do provedor. Usar somente chave **Development**, com limite oficial de 100 solicitações/minuto; chaves Production exigem plano pago ou PAYGO e estão excluídas. O responsável deve conferir também o consumo externo à aplicação e a ausência de cobrança automática. Esgotamento de qualquer cota bloqueia novas chamadas. [Tipos de chave e limites oficiais](https://docs.tavily.com/documentation/rate-limits).

A biblioteca mantém suas 90 consultas. O planejamento existente distribui até 20 vagas diárias: 12 de prioridade, 5 de rotação e 3 de contexto aprovado. Sem contexto há 17 chamadas/dia, até 527 num mês de 31 dias; com todo o contexto, até 620, abaixo dos 1.000 créditos gratuitos. Não se inventam indicações/eventos para preencher vagas. Não há exigência de executar as 90 consultas diariamente, nem alteração silenciosa das consultas.

Tavily é outro provedor de busca: domínio, aspas e localização orientam a consulta, mas não garantem os mesmos resultados do Google. Places localiza estabelecimentos e não executa esta biblioteca de busca web.

## Contrato do adaptador

`createTavilySearchProvider(config, deps)` exporta `{id:'tavily_search', mode:'authorized', costMode:'free_only', creditsPerQuery:1, search(query, context)}`. Não existe credencial padrão nem endpoint configurável.

O POST usa exclusivamente `https://api.tavily.com/search`, com Bearer no cabeçalho. O corpo fixa `search_depth:'basic'`, `auto_parameters:false`, `max_results:5`, `include_usage:true`, `topic:'general'`, `country:'brazil'`, `language:'portuguese'`, `exact_match:true` e desliga answer, raw content, imagens, descrições e favicon. `basic` custa um crédito; desligar os parâmetros automáticos impede escolha automática de profundidade mais cara. País/idioma são preferências, não prova de localização. [Referência oficial de Search](https://docs.tavily.com/documentation/api-reference/endpoint/search).

`normalizeTavilyQuery` preserva `originalQuery`. A biblioteca atual contém 75 buscas sem operador, 14 com `site:instagram.com` e uma com `site:linkedin.com/company/`. Sem operador, `providerQuery` mantém o texto, a tradução registra `mode:'none'` e ambos os parâmetros de domínio são omitidos: informar `include_domains_mode` sem domínios causaria HTTP 400. Com um operador positivo, ele é removido somente da consulta enviada e convertido explicitamente em `include_domains` e `include_domains_mode:'restrict'`. O prefixo `/company/` também é validado localmente, com distinção de maiúsculas e limite de segmento; `/company-fake` não passa. A documentação exemplifica filtro por domínio/caminho. [Boas práticas oficiais](https://docs.tavily.com/documentation/best-practices/best-practices-search).

Operadores compostos, negativos, desconhecidos, curingas, filtros com credenciais, portas, esquema de URL, caminhos relativos ou codificação ambígua são recusados antes da reserva/chamada. As frases entre aspas são preservadas e enviadas com correspondência exata. Isso traduz a sintaxe documentadamente; não declara equivalência de cobertura entre buscadores.

## Novo gate de uso permitido — revisão de 24/10/2026

Os [Termos da Plataforma](https://www.tavily.com/terms), atualização de 04/05/2026, e a [Política de Uso Aceitável](https://www.tavily.com/acceptable-use-policy), atualização de **21/10/2026**, requerem uma análise adicional **sobre o caso de uso**, não apenas sobre retenção e custo. A AUP proíbe facilitar comunicações promocionais não solicitadas; os termos também restringem uso ligado a propostas comerciais não solicitadas. A busca de empresas para prospecção pode fazer parte desse contexto, mesmo que a aplicação não envie mensagens via Tavily. Não presumir que todo uso interno comercial esteja automaticamente autorizado. A interpretação jurídica e a autorização do fornecedor, quando necessária, continuam pendentes.

**Estado padrão: bloqueado.** O adaptador agora exige, separadamente:

- `useCaseApproved:true`, somente quando houver revisão documentada que confirme o uso pretendido como permitido;
- `useCaseApprovalRef` não vazio, vinculado à análise;
- variáveis server-only `TAVILY_COMMERCIAL_USE_APPROVED='true'` e `TAVILY_COMMERCIAL_USE_APPROVAL_REFERENCE`, sem valor por padrão.

Sem ambos, `tavily_use_case_review_required` impede a chamada **antes** da reserva de crédito e do transporte HTTP. `serverReadiness.research` permanece falso. Isso não libera a persistência: `TAVILY_METADATA_PERSISTENCE_APPROVED` e sua evidência continuam sendo outro gate. Tampouco libera contatos externos, consentimento WhatsApp ou uma campanha.

Nenhuma ativação, aceite novo de termos ou consulta real foi realizada nesta atualização. Para revisão, descrever ao fornecedor o fluxo exato: biblioteca de consultas públicas por segmento e cidade, qualificação de empresas, nenhum envio pela Tavily, acesso limitado e nenhuma inferência de consentimento. Se o uso for proibido ou não puder ser confirmado, preservar o módulo desativado e avaliar outro meio tecnicamente autorizado **somente mediante decisão explícita do proprietário**, sem substituição silenciosa.

Após autorização específica do proprietário, foi enviada **uma consulta a `support@tavily.com`**, endereço indicado nos termos oficiais. O Gmail confirmou envio e a releitura conferiu destinatário, conteúdo e ausência de cópia/anexos. O pedido descreve o caso de uso por segmento/cidade, até vinte buscas básicas diárias, revisão humana e contato somente mediante autorização independente. Também pergunta se URL canônica, título, consulta pública e data podem ficar no CRM privado por até trinta dias, e quais condições de atribuição, descarte e plano Free se aplicam. Esse prazo é uma proposta para esclarecimento, sem aprovação ou rotina de descarte implementada. Não foram enviados dados de clientes ou credenciais, nem autorizados custo, suporte pago, upgrade ou novos termos. **Resposta do fornecedor pendente; ambos os gates permanecem bloqueados.**

## Configuração e interrupção

Campos necessários no objeto confiável do servidor:

- `enabled:true`, `approved:true` e `approvalRef` não vazio;
- `costMode:'free_only'`, `estimatedCostMicros:0`, `freePlanVerified:true` e `freePlanReviewThrough` ISO futuro, com revisão no máximo 31 dias adiante;
- `apiKey` privada e `clock` confiável, opcionalmente `timeoutMs` entre os limites do transporte;
- dependências `reserveBudget({provider:'tavily_search',costMicros:0})` e `onUnexpectedUsage(event)`, ambas obrigatórias; `fetchImpl` injetável para QA;
- `useCaseApproved:true` e `useCaseApprovalRef` somente após análise e confirmação independente do caso de uso comercial permitido; 
- `metadataPersistenceApproved` ausente/falso por padrão; para permitir persistência mínima exige também `metadataPersistenceApprovalRef` explícita e separada.

O autorizador e a reserva rodam antes de cada acesso. O adaptador não repete requisições, não segue redirects e não muda para outro serviço/plano. Cancelamento prévio não faz chamada. Erros contêm somente códigos/status, sem chave, corpo ou resposta privada.

`usage.credits` precisa ser exatamente o número `1`. Ausência, tipo inválido ou divergência suspende a instância e gera `ProviderError('tavily_credit_mismatch')`. O callback recebe somente provider, código, esperado e consumo numérico limitado ou `null`; o integrador deve persistir a pausa antes de novas execuções. Falha no callback não libera a instância. Erros HTTP/transporte continuam consumindo a reserva conservadora da tentativa.

## Proveniência e persistência

Cada resultado é `candidateType:'web_page'`: o campo legado `name` contém o título da página, sem afirmar identidade empresarial. URL/título têm tamanho limitado; só URLs HTTPS, sem credenciais/portas/IPs/hosts privados, dentro do domínio/prefixo quando filtrados. Query e fragmento da URL são descartados. Os links são metadados; nenhuma página é aberta ou resolvida em rede pelo adaptador. O identificador estável é `tavily_` mais SHA-256 da URL canônica.

O registro contém consulta original, consulta traduzida, tradução do filtro e horário de obtenção, todos marcados como não verificados. `criteria` fica inteiramente zero, `activityVerified:false`, `companyVerified:false`, `locationVerified:false`, `reviewed:false` e `consent:null`. A única evidência afirma “URL retornada por busca programática; conteúdo, identidade e atividade não verificados”, com `verificationScope:'search_result_received'`, `verified:false` e `reviewed:false`. O campo legado `verifiedAt` registra apenas o horário desse recebimento, também explícito em `observedAt`; não comprova que a página foi aberta ou seu conteúdo conferido. Essa evidência não alimenta os fatos revisados do agente nem sustenta pontuação positiva. Encontrar uma página não comprova atividade, adequação comercial, endereço, consentimento ou autorização para contato.

`persistenceAllowed:false` é o padrão. A política é **Minimal metadata URL + title only; verification required**, acompanhada apenas da proveniência técnica e dos indicadores de revisão. A construção por lista permitida remove fisicamente conteúdo, snippets, HTML, respostas, imagens, pontuações do provedor e contatos; não há uma mera flag cobrindo conteúdo retido. Mesmo após aprovação de persistência, esses campos continuam ausentes.

Os termos permitem uso empresarial interno, mas exigem verificação de outputs, observância de direitos de terceiros e restringem propostas comerciais não solicitadas. A cláusula de propriedade do cliente menciona Input; não foi identificada autorização explícita e irrestrita de armazenamento permanente de Output URL/título. Essa revisão de persistência permanece pendente. Enviar somente consultas públicas aprovadas da biblioteca; não enviar dados privados do CRM, contatos, credenciais ou dados sensíveis. A descoberta não autoriza campanha. [Termos oficiais, especialmente §§2, 3.2, 6.4, 9 e 10.2](https://www.tavily.com/terms).

Na revisão complementar de **24/10/2026**, a página mantém atualização de 04/05/2026. As cláusulas 6.5, 6.7 e 7 permitem tratamento/compartilhamento de inputs e outputs em determinadas funcionalidades, inclusive melhoria de modelos. Por isso, a integração continua restrita à biblioteca pública, sem contexto privado do CRM. A consulta não resolveu a autorização de armazenamento permanente de metadados; `metadataPersistenceApproved` permanece falso e o runner conserva somente contagens dos resultados restritos. Não houve nova busca, aceite ou envio de dados nessa revisão. [Termos consultados](https://www.tavily.com/terms).

## Verificação local

Executar `node qa/prospecting/free-research-provider.mjs`. A QA usa `fetchImpl` fictício e cobre as 90 consultas intactas e seus corpos de requisição, domínio/prefixo/aspas, corpo fixo de um crédito, bloqueios de configuração/cota/revisão, metadados sem conteúdo, aprovação de persistência, gravação real em SQLite após todas as migrações sem transformar o retorno em fato revisado, respostas adversariais, divergência de créditos com suspensão, timeout/cancelamento e erros sem segredos. Nenhuma chamada real é necessária para esses testes.
