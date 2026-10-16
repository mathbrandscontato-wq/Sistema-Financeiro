# Formulários comerciais e Analytics V1

## Auditoria e decisões

Código inspecionado: Financeiro `7995a51394919f4d8977278e7bf794f3ab745e5b`, público `0126187bb818b18f85919407795b6f56341bbddb`.

Arquitetura verificada: React/Vinext em Worker, D1 para dados e R2 para snapshots. CRM existente contém clientes, oportunidades, contratos, pagamentos, histórico e vínculos de orçamentos. Diagnóstico público em Worker ESM, com gateway autenticado ao CRM privado. Perguntas, condições, regras de diagnóstico e recomendações foram preservadas.

Reutilizados `intake_forms` (slug e versão), `intake_sessions` (respostas, resultado, atribuição, expiração), `intake_captures`, chaves normalizadas de contato e vínculos por cliente/formulário. Capturas repetidas geram histórico sem duplicar o cliente ou a oportunidade do mesmo formulário. Formulários diferentes podem originar oportunidades distintas para o mesmo cliente.

Migration aditiva 0009: eventos pseudônimos, parâmetros analíticos, oferta, ocupação de vagas e auditoria. Sem recriação de tabelas, modificação de dados anteriores ou seed de clientes em SQL. Escritas SQL condicionais atômicas impedem ultrapassar capacidade, confirmar sem aprovação/sinal e aceitar um formulário promocional esgotado. O predicado de disponibilidade fica dentro do INSERT, não apenas numa consulta anterior. Inicialização associa somente os dois contratos existentes identificados no histórico comercial, sem criar pagamentos nem reajustar valores.

## URLs públicas

- `/`: Diagnóstico de Marca existente, identificador `identidade-visual`, versão 1.
- `/sites/projeto-especial`: `sites-projeto-especial`, versão 1.
- `/sites/orcamento`: `sites-orcamento`, versão 1.
- `/privacidade`: política de coleta, rastreamento, conservação e direitos.

Formulários de sites têm quatro etapas. Convencional não apresenta preço automático; os valores são definidos nos orçamentos existentes. Oferta promocional inicia com referência de R$300, dez vagas e sinal mínimo de 50%. Valor administrável; valores históricos conservados.

## Endpoints

Públicos no gateway: `GET/POST /api/diagnostico`, `GET /api/sites?form=<slug>`, `POST /api/sites`, `POST /api/events`. Somente ações expressamente permitidas são encaminhadas. Método, origem, tamanho de corpo, tipos e honeypot são validados. O gateway não encaminha cookies nem identidade do visitante ao sistema privado.

Backend privado: `GET/POST /api/intake`, protegido por segredo compartilhado e token de acesso ao Site. Ações antigas `start`, `diagnose`, `capture` preservadas; novas `event` e `site_submit`. Corpo até 20 KB. `site_submit` recebe requestId UUID, token secreto de 64 hex, formSlug, contact, answers, attribution e metadados opcionais de consentimento. IDs de submissão são idempotentes; respostas e contatos divergentes no mesmo ID retornam conflito.

`GET /api/acquisition`: exige `acquisition.read`, recebe from/to, form, channel, device. Calcula somente registros do proprietário autorizado. Marketing não recebe tabela de leads ou receitas; Comercial recebe leads mas não valores financeiros. Proprietário recebe administração da oferta.

`POST /api/acquisition`: somente proprietário, valida origem e corpo até 5 KB. `confirm` recebe contractId e reason; verifica contrato ativo, etapa Fechado e sinais efetivos >=50%, em transação com auditoria. `release` exige motivo e autorização administrativa. `configure` recebe priceCents, status, abandonMinutes, attributionDays e reason. Em caso de lotação, libere a vaga com motivo e reabra a oferta explicitamente. Pagamentos estornados não liberam vagas silenciosamente; o proprietário revisa e libera pelo controle administrativo.

## Medição

Eventos permitidos: form_view, form_start, form_step_view, form_step_complete, form_submit_attempt, form_submit_success, form_submit_error, form_validation_error, form_closed_view, form_redirect. Sucesso é gravado pelo servidor somente depois da captura comercial confirmada; o navegador não pode enviá-lo livremente. Deduplicação por ID de evento e por submissão no sucesso. Registros armazenam slug, sessão pseudônima, horário do servidor, etapa controlada, dispositivo e UTMs validadas. Não armazenam valores digitados, e-mails, telefones ou query completa nos eventos.

Consentimento opcional fica no navegador; não é identificador de visitante. Sessão é aleatória e mantida em memória por visita, sem cookie de rastreamento ou identificação entre visitas. Sem consentimento não há eventos; o lead continua sendo recebido normalmente. Falhas de Analytics são isoladas da captura. Limites persistentes por IP pseudonimizado e ação: eventos 600/h; demais limites da camada de intake conservados.

Taxa de início = sessões iniciadas / sessões visualizadas. Conclusão = sessões concluídas / iniciadas. Conversão em lead = sessões com captura confirmada / visualizadas. Conversão comercial = oportunidades ganhas com contrato atribuído / leads únicos. Abandono = início sem captura depois de 1440 minutos de inatividade, configurável. A última etapa vista determina o abandono.

Filtros seguem a coorte de primeira visita, quando medida; sem medição, a primeira captura. Leads são únicos por oportunidade e atribuídos à primeira captura. Comparação usa período anterior de mesma duração. Receitas mostram posição acumulada dos contratos dessa coorte, confirmados dentro de 90 dias (configurável). Contratos e pagamentos são somados por registros únicos; estornos e contratos cancelados ficam excluídos. Propostas enviadas usam orçamento vinculado com status além de Rascunho ou etapa explícita Proposta enviada. Qualificação e etapa são posições atuais do CRM. Histórico anterior sem visita não gera eventos simulados.

## Segurança, retenção e operação

Dados financeiros permanecem no Site privado. Sem integração financeira automática com Ritmo. Papéis e autenticação existentes preservados. Backups incluem as novas tabelas e são criados antes de mutações comerciais/administrativas. Eventos são expurgados após 180 dias na ingestão subsequente. Sessões não capturadas têm prazo de 14 dias; leads sem contrato são revisados administrativamente após 12 meses. Pedidos de titulares têm canal documentado; exclusão depende da conferência e obrigações de conservação, sem apagar contratos ou auditoria silenciosamente.

A oferta consome vaga apenas na confirmação administrativa de contratação, após o registro do sinal no Financeiro. Esse passo é explícito, não uma confirmação automática de pagamento. O gateway pode mudar de origem privada usando COMMERCIAL_INTAKE_URL, preservando segredos em runtime. Caminhos públicos relativos permitem migração de domínio.

## Homologação e restauração

Testes: diagnóstico original e gateway; TypeScript; regressões de proteção/documentos, importação, CRM, financeiro, dashboard, intake, permissões, integrações e planejamento; novas validações de eventos, métricas, SQL real, reenvios, consentimento, falha analítica, permissões e concorrência em duas conexões disputando a última vaga. Páginas e scripts públicos validados, campos/etapas, CSP e regras responsivas inspecionadas. Browser QA visual não disponível no ambiente; não há capturas desktop/mobile nem alegação de validação visual por navegador.

Reversão: republicar versões anteriores dos dois Sites ou construir os commits acima. Migração aditiva deve permanecer no banco na reversão; não aplicar down destrutivo. Dados e backups novos permanecem preservados. Publicação primeiro do backend privado, depois do gateway público, sem alterar audiência. Commits e versões de publicação registrados pelo fluxo Sites.

Compatibilidade de hospedagem: a tentativa com gatilhos SQL foi rejeitada pelo serviço e a migration não foi aplicada, confirmado pela leitura do esquema remoto. A migration 0009 foi reparada antes de aplicação; controle de capacidade utiliza INSERT SELECT condicional, UPSERT e batch transacional, sem gatilhos.

## Simplificação do painel

Visão principal reduzida a visitas, leads, contratos e receita recebida, com tabela por formulário. Período e formulário são os filtros principais; canal e dispositivo ficam em Mais filtros. Métricas adicionais, origem, evolução e leads ficam recolhidos em Ver análise detalhada. Gestão administrativa da oferta permanece recolhida e restrita ao proprietário. Aviso técnico extenso removido da interface; cálculos, dados, consentimento e permissões não foram alterados. Anexo de observação enviado pelo usuário indisponível; a observação específica ainda depende de identificação.
