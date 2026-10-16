# Math Brands · Evolução comercial e Analytics V1

Auditoria e entrega: 15/10/2026. Escopo: Leads, apresentação comercial, navegação e métricas. Não altera valores, contratos, pagamentos, autenticação, credenciais ou etapas armazenadas. Sem migração de banco.

## 1. Estado anterior e causas

| Problema | Causa confirmada | Solução |
| --- | --- | --- |
| Contato escondido | A entrada do CRM priorizava um Kanban; a aba Diagnósticos mostrava nome e pedido, sem ação de contato | Leads com nome, telefone, e-mail e ações diretas |
| Analytics duplicado | IntakePanel incorporava o mesmo AcquisitionPanel disponível no menu | Diagnósticos conserva respostas e pedidos; Analytics tem uma única área |
| Falta de hierarquia comercial | Visitas e receitas dominavam o topo; qualificação e propostas ficavam dentro de detalhes | Cinco indicadores essenciais, evolução/origens e ações comerciais |
| Leads ausentes de gráficos | Canais e dias eram enumerados apenas a partir de eventos consentidos | União das origens e datas de eventos e capturas reais |
| Dias inconsistentes | Filtro por coorte da primeira visita, mas linha diária por data de envio | Evolução diária usa a mesma data de coorte do filtro |
| Menu mobile pouco claro | Rótulos ocultos e várias áreas com ícones iguais | Navegação horizontal com rótulos e alvos de pelo menos 44 px |
| Confusão de conceitos | Contratos, oportunidades ganhas e clientes não são a mesma contagem | Clientes distintos, ganhos e conversão têm regras explícitas |

Esta análise de UX resulta da inspeção do código e dos dados. Não foi realizada pesquisa com usuários, nem observação de sessões de uso.

## 2. Arquitetura e integração confirmadas

**Sistema Financeiro**: React 19, Vinext/Vite, rotas de servidor, Cloudflare Workers, D1 no binding DB e R2 no binding BUCKET. O acesso do Site é customizado/restrito. A aplicação usa autenticação ChatGPT e workspaceAccess, com proprietário definido por INTAKE_OWNER e membros por e-mail/perfil. CRM, orçamentos, financeiro, medição e backups possuem tabelas próprias dentro deste projeto.

**Diagnóstico**: Worker ESM com HTML/CSS/JS, público, sem D1 e sem R2 próprios. Não depende de sessão administrativa do visitante. /api/diagnostico, /api/sites e /api/events encaminham operações restritas para /api/intake do Sistema Financeiro. COMMERCIAL_SITE_TOKEN atravessa o controle do Site; INTAKE_SHARED_SECRET autoriza a integração no aplicativo. Ambos ficam exclusivamente no servidor. O gateway restringe origem, ações, corpo e tempo de resposta, rejeita redirecionamentos inesperados e fornece chave de limitação de abuso.

**Jornada**: visita e consentimento opcional de medição → início/respostas → intake_sessions com resultado → pedido de contato validado → intake_captures → commercial_clients e commercial_opportunities → commercial_history → acompanhamento, orçamento vinculado e contratação. A captura não é presumida a partir de uma visita ou de um resultado sem contato confirmado. As preferências de atendimento e a autorização promocional permanecem distintas.

A integração já existia e foi conservada. Não foram criadas sincronizações paralelas ou cópias de contatos. Contatos estão em commercial_clients e no snapshot intake_captures.contact; respostas/resultado em intake_sessions; atividades em commercial_history. Leads usa o GET autenticado /api/commercial. O botão WhatsApp apenas abre o aplicativo; não envia mensagens automaticamente.

## 3. Evidência de produção anterior à publicação

Consulta legítima às tabelas do projeto confirmou: 6 clientes, 6 oportunidades, 3 contratos, 2 pagamentos, 1 orçamento, 1 captura e 1 sessão de diagnóstico. A captura está vinculada a uma oportunidade Novo lead e à sessão correspondente. A origem registrada é Diagnóstico de identidade visual; o resultado é Avaliação personalizada. Esses números descrevem registros existentes, não novos clientes atribuídos a esta entrega.

Foram identificados 11 registros de snapshots de proteção, incluindo um de 14/10/2026. Esta auditoria confirmou os metadados dos backups; não executou restauração de produção nem verificou os bytes de cada objeto R2.

GET público /api/diagnostico respondeu 200 e retornou o formulário identidade-visual V1, demonstrando a leitura real através do gateway até o projeto comercial. Acesso sem autenticação a /api/commercial foi bloqueado com 401.

## 4. Organização implementada

Visão geral → Leads → Oportunidades → Clientes → Orçamentos → Financeiro → Planejamento → Analytics → Configurações. O proprietário passa a entrar pela Visão geral. Cada perfil continua limitado às permissões existentes. Leads e Clientes reutilizam o CRM e seus formulários; não criam bases separadas.

Leads mostra uma linha por oportunidade, o contato disponível, origem/formulário, data da última captura (ou cadastro manual), estágio atual, resultado vinculado e próxima ação. Busca por nome, empresa, e-mail ou telefone, inclusive telefone com pontuação diferente. Filtros de data, origem, estágio e arquivamento. WhatsApp/e-mail diretos e acesso ao detalhe para editar, acompanhar, registrar negociação e consultar respostas e histórico.

Os dez estágios existentes foram preservados, incluindo Aguardando resposta e Acompanhamento. Ganho/Perdido continuam sendo rótulos de Fechado/Recusado. Telefones nacionais com DDD e 10/11 dígitos usam o código brasileiro 55 no link; números internacionais exigem formato compatível. Números incompletos não geram links presumidos. Dados ausentes são identificados. O contato atual do cadastro prevalece sobre o snapshot; a evidência original permanece intacta.

## 5. Analytics e definições

O Analytics analisa a coorte dos formulários, não todos os negócios manuais/importados. Estes permanecem na Visão geral e no CRM. Períodos seguem America/Sao_Paulo. A coorte usa a primeira visita medida associada à primeira captura da oportunidade; sem evento associado, usa a captura. Reenvios não criam novos leads únicos.

| Indicador | Fórmula e fonte |
| --- | --- |
| Leads capturados | COUNT DISTINCT opportunity_id em intake_captures, com sessão/formulário e filtros aplicados |
| Leads qualificados | Leads cuja etapa atual é Qualificação, Orçamento em elaboração, Proposta enviada, Negociação, Aguardando resposta, Acompanhamento ou Fechado; representa progresso atual, não evento de qualificação |
| Propostas enviadas | Oportunidades com orçamento vinculado em Enviado/Aprovado/Recusado/Vencido, ou etapa atual Proposta enviada; rascunhos excluídos |
| Clientes conquistados | Clientes distintos de oportunidades Fechado com contrato ativo atribuído após a captura, na janela configurada |
| Conversão comercial | Oportunidades ganhas com contrato atribuído ÷ leads × 100; zero quando não há leads |
| Sessões medidas | Pares formulário/sessão com evento form_view consentido; não são pessoas únicas |
| Envios medidos | Sessões com confirmação de servidor form_submit_success; independentes do total de capturas sem medição |
| Receita atribuída | Valores dos contratos elegíveis e pagamentos sem estorno; acumulados, não caixa do período |

A evolução e os canais agora incluem capturas sem eventos de Analytics. Origem sem UTM é identificada, sem atribuir canal inventado. O filtro por dispositivo só inclui registros medidos compatíveis; pode reduzir o total. O período anterior usa a mesma duração quando há duas datas definidas. Indicadores de etapa atual não mostram transições históricas: são uma fotografia atual da coorte. As barras de avanço não pressupõem um funil sequencial completo. A tabela diária torna os valores dos gráficos consultáveis em texto.

## 6. Proteção, migração e reversão

Nenhuma tabela, coluna, credencial, integração ou valor financeiro foi alterado. A atualização adiciona apresentações e campos derivados na resposta já autenticada do Analytics. Marketing não recebe a lista de leads; comercial continua sem receitas; Financeiro não ganha acesso ao CRM. As mutações de acompanhamento usam os mecanismos existentes de backup, revisão concorrente e auditoria.

Reversão: republicar a versão anterior arquivada do Sistema Financeiro (V17, commit e3269b55d973fb06f79d1eae5312c7304231b8bc). Como não há alteração de esquema ou de integração, não exige rollback SQL nem restauração de registros. O Diagnóstico permanece no commit auditado 19ce6ad1532439b7ceefaa41488d3a43a5c41d0e. Publicação e commit da entrega constam no fechamento desta tarefa.

## 7. Validação e limites

Testes específicos: contatos/links seguros, dados ausentes, buscas/filtros, deduplicação, isolamento de perfis, capturas sem consentimento de medição, canal, evolução por coorte, contratos inativos, propostas em rascunho e 500 leads sintéticos. TypeScript sem erros. Regressão do projeto cobre proteção/PDF, importação, CRM, Financeiro, Dashboard, diagnóstico, permissões, API de pagamentos, Planejamento, formulários e concorrência. Testes do gateway público, Sites e contato do portfólio executados em ambiente de teste. Nenhum pagamento real foi criado, alterado ou estornado para teste.

**Capturas comparativas e validação visual desktop/mobile: não realizadas.** O navegador exigido pelo ambiente Sites não está disponível. Não foram produzidas imagens simuladas como evidência. Foram implementados layouts responsivos, foco visível, rótulos, alvos de toque, alternativa textual para gráficos e redução de movimento; isso não substitui verificação assistiva e visual no navegador. O fluxo autenticado completo e uma nova captura real também não foram executados em produção. As evidências de integração combinam dados existentes, leitura pública real e testes isolados de persistência e gateway.

Limites residuais: métricas de qualificação/proposta dependem das evidências disponíveis; etapas não constituem uma série histórica de conversão. Atribuição depende das UTMs e do consentimento, sem inferência de pessoas únicas. As consultas comerciais ainda carregam a base inteira; o ensaio com 500 leads não é teste de carga da infraestrutura. O anexo Instrução.txt não foi recebido. Recomendação de próxima verificação: inspeção visual em 390 px e desktop, navegação por teclado e leitor de tela, e ciclo autenticado com um contato de teste explicitamente identificado.
