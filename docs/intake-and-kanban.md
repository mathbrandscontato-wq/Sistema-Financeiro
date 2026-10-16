# Evolução comercial: blocos 01, 02 e 03

Implementados o Kanban, o primeiro diagnóstico público de identidade visual e a entrada explícita de solicitações no CRM existente. A plataforma continua independente da Ritmo. Nenhuma API de pagamento externa foi ligada.

## Operação

O CRM abre em Kanban. As colunas são Novo lead, Aguardando contato, Qualificação, Orçamento em elaboração, Proposta enviada, Negociação, Ganho e Perdido. A seleção de etapa funciona com teclado e celular; em desktop também é possível arrastar cartões. A perda exige motivo. Origem, serviço de interesse e intenção são atributos da oportunidade, com origem filtrável. A próxima ação e sua data seguem editáveis.

Os valores originais da planilha não são regravados. Contato inicial aparece como Aguardando contato; Fechado como Ganho; Recusado como Perdido. Acompanhamento e Aguardando resposta aparecem na coluna Negociação, conservando o texto histórico no cartão. Marcar ganho não registra pagamento ou assinatura.

A aba Diagnósticos contém o link público e os pedidos efetivos. O visitante responde antes de informar dados pessoais, recebe uma orientação sem pontuação e pode solicitar atendimento. Consistência de materiais só é perguntada a quem declara uma identidade estruturada. Respostas contraditórias levam a uma avaliação personalizada com pedido de esclarecimento. A intenção de contratação influencia a informação comercial, sem mudar a qualidade atribuída à marca.

Nome, empresa e pelo menos um canal de contato são necessários somente para o atendimento. Ciência do aviso de privacidade e solicitação de atendimento são obrigatórias; autorização promocional é separada e desmarcada inicialmente. As respostas, resultado, versão, atribuição por campanhas, preferências e data ficam preservados no histórico da oportunidade.

## Acesso e persistência

O painel principal conserva a política privada. A página pública é um Worker separado exclusivamente para a apresentação do diagnóstico e um proxy restrito. A base, regras de diagnóstico, contatos, oportunidades e financeiro permanecem no backend original. O proxy não tem banco próprio, não encaminha identidade do visitante e não aceita rotas administrativas.

O gateway usa dois segredos de runtime: `COMMERCIAL_SITE_TOKEN` para acesso de serviço ao Site privado e `INTAKE_SHARED_SECRET` para autorização restrita do módulo. O backend usa também `INTAKE_OWNER`, resolvido a partir dos registros existentes, e `INTAKE_PUBLIC_URL`. Nenhum segredo é salvo no Git ou enviado ao navegador. `/api/intake` não trata a autorização de serviço como uma sessão de usuário; o proprietário é definido pela configuração do módulo. As APIs administrativas continuam exigindo identidade e filtrando o proprietário.

A migração 0005 é aditiva. Inclui metadados comerciais e tabelas `intake_forms`, `intake_sessions`, `intake_captures`, `intake_contact_keys`, `intake_lead_links` e `intake_rate_limits`. Cópias de proteção e exportação abrangem essas tabelas. O modelo de backup passa a versão 5. Os arquivos e o motor de PDF não são alterados.

Diagnósticos sem contato não criam clientes, oportunidades, contratos ou receitas. A sessão exige token aleatório de 256 bits, armazenado apenas por hash no servidor, e expira em 14 dias. Sessões expiradas sem captura são removidas no próximo envio de diagnóstico; cópias de proteção podem conservar registros históricos. Pedidos com contato permanecem no histórico comercial. A sessão em memória do navegador se perde ao recarregar a página.

Pedidos repetidos da mesma sessão têm confirmação idempotente e conteúdo diferente resulta em conflito. Uma nova sessão para o mesmo contato e versão de diagnóstico acrescenta histórico à oportunidade existente. Nome de empresa não autoriza fusão automática; comparação usa canais normalizados e chaves únicas. Canais ligados a cadastros diferentes ou arquivados exigem conferência. Captura não sobrescreve dados do cadastro existente. As transações cancelam gravações parciais, e a falha de backup bloqueia a operação.

Há limite persistente de 30 diagnósticos e 20 tentativas de captura por hora por identificador de rede derivado com segredo. IP bruto não é salvo. UTM aceita somente códigos curtos de campanha; URL de referência, query strings arbitrárias e dados pessoais adicionais não são capturados. Isso reduz abuso simples; CAPTCHA e monitoramento mais completo podem ser acrescentados se o volume exigir.

## Validação e evolução

`pnpm test:intake` executa o próprio serviço com adaptador SQLite, incluindo cenários de diagnóstico, gravações, reenvios, deduplicação, isolamento, expiração, limite de solicitações, falha de proteção e conservação do financeiro. O gateway verifica sintaxe da página, CSP, restrição de ações, origem, tamanho e encaminhamento de segredos somente ao backend. Também são executados tipagem, build e regressões de CRM, importação, financeiro, dashboard e fidelidade de PDF.

Esta entrega não inclui um editor genérico de questionários, publicação de versões pelo painel, equipe com responsáveis/permissões individuais ou métricas completas de abandono e campanhas. A primeira versão de regras está congelada no código e identificada nos registros. Evoluções futuras devem gerar outra versão e preservar respostas antigas. Pedidos do mesmo contato para esta versão reutilizam a mesma oportunidade, inclusive após seu fechamento; um fluxo de reabertura ou nova oportunidade pode ser definido na próxima evolução sem duplicar tentativas de envio.

QA de navegação real e experiência em celulares continua pendente quando não há navegador de teste disponível. A publicação e os testes HTTP verificam disponibilização e fronteiras de acesso, sem inventar leads ou pagamentos no banco comercial de produção.


## Evolução versão 6

Aquisição, responsáveis, permissões de equipe, contato visível com Instagram/site e preparação da API financeira são descritos em `acquisition-team-and-payment-api.md`. O backup completo agora usa `dataModelVersion: 6`. O editor genérico de questionários permanece fora desta entrega.
