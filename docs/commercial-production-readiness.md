# Automação comercial — homologação e preparação de produção

Atualizado em 22/10/2026. **A automação não está ativa.** Não houve merge, deploy, migração remota, mensagem real, contratação de serviço ou conexão do número. As autorizações para continuar e criar PRs foram aplicadas ao desenvolvimento e à homologação; os gates específicos de produção permanecem.

## O que foi entregue

O Sistema Financeiro continua como CRM oficial. Foram reutilizados clientes, oportunidades, planejadores existentes, próximas ações, histórico, formulários, oferta/vagas, permissões do proprietário, D1 e proteção em R2. Pesquisa não cria interessado, interesse não cria contrato, Pix enviado não confirma pagamento. O runtime não escreve tabelas financeiras.

| Componente | Implementação e prova | Ativação |
| --- | --- | --- |
| Biblioteca original 15 mercados/90 consultas | Preservada; testes de integridade | Não |
| Pesquisa, rodízio 60/25/15, evidências e deduplicação | SQLite, orçamento, falhas e retomada | Não |
| Rotina diária 10h30 São Paulo | Handler + Worker, fuso, fins de semana e feriados testados | Template desligado |
| WhatsApp oficial e relay LP/CRM privado | HMAC, replay, conta, limite de corpo e isolamento testados | Não |
| Consentimento, pausa humana, opt-out e cota dez | SQL concorrente e testes integrados | Não |
| Agente consultivo | Determinístico + Responses; prosa LLM exige revisão humana | Não |
| Handoff CRM e avisos | Tarefa/histórico idempotentes, e-mail pendente e falhas testados; WhatsApp do proprietário separado para confirmação manual | Provedor/template pendentes |
| Pix após avaliação e aceite | Aprovação humana, aceite real, CRC/chave e valor R$200 testados | Pix oficial pendente |
| Painel privado e backup | Tipos, build e HTTP local com D1/R2 | Não publicado |

Ordem dos PRs do CRM: [núcleo offline #4](https://github.com/mathbrandscontato-wq/Sistema-Financeiro/pull/4) → [sinal contratual #5](https://github.com/mathbrandscontato-wq/Sistema-Financeiro/pull/5) → runtime desta branch. A [LP #4](https://github.com/mathbrandscontato-wq/mathbrands-projeto-especial/pull/4) é separada e depende das novas rotas do CRM. Nenhum PR foi mesclado.

## Estado real e conflitos

- CRM hospedado permanece privado e ainda não contém o runtime desta branch. A oferta consultada em produção está em **R$300**, enquanto o padrão aprovado é **R$500 / R$200 / R$300**. Não foi alterada. O gate externo exige preço R$500 e `deposit_policy='contract_deposit'`.
- A LP atual publicada usa R$500/200/300, sem Pix. O GitHub estava atrasado; o PR alinha primeiro ao snapshot atual de Sites (`3824c4e`), evitando restaurar preços antigos. Depois esclarece domínio à parte, hospedagem condicional e saldo na entrega validada. CSS, scripts do formulário e campos foram comparados nas três rotas.
- As configurações existentes de intake foram preservadas. As novas credenciais de Meta/IA/pesquisa/e-mail não estão configuradas no ambiente publicado. Secrets não foram divulgados ou incorporados ao código.
- Meta Business foi consultado na sessão autenticada. O seletor apresentava dois portfólios; foi selecionado **Math Brands**. Nesse portfólio, a interface mostrou nenhuma conta de WhatsApp adicionada, nenhuma conta de mensagens e nenhum aplicativo adicionado. Isso não comprova inexistência de contas fora do portfólio. Coexistência, dispositivos vinculados e eco humano continuam não homologados. Nenhum registro de número, migração ou desconexão foi tentado.
- O proprietário autorizou especificamente o aceite dos Termos da Plataforma e das Políticas do Desenvolvedor e o cadastro de desenvolvedor para homologação. O cadastro foi concluído e o portal abriu **Todos os apps**, com a criação de aplicativo disponível. A conta foi classificada como Proprietário/fundador; o e-mail existente foi confirmado sem adesão a marketing. Essa confirmação no portal não substitui a homologação de entrega dos avisos do CRM.
- A Meta exigiu adicionar primeiro o celular na **Central de Contas**. O proprietário concluiu essa inclusão e confirmou o código de seis dígitos diretamente na Meta. A interface marcou a verificação como completa. Nenhum código foi solicitado no chat e o agente não incluiu novo contato de autenticação. O celular de autenticação não foi usado como destinatário de aviso ou contato comercial.
- O assistente de criação foi preenchido até a revisão final: **Math Brands Homologação**, caso de uso **Conectar-se com clientes pelo WhatsApp**, portfólio **Math Brands**, indicado como empresa não verificada. O proprietário autorizou especificamente o novo aceite de termos e a criação. Ao clicar em **Criar aplicativo**, a Meta solicitou a senha novamente; essa confirmação está entregue ao proprietário, diretamente na página. A criação ainda não foi confirmada pela interface e nenhuma credencial foi emitida.
- O e-mail informado pelo proprietário foi configurado **somente na base local**, com verificação falsa. Não foi enviado teste; o endereço não integra o código ou exemplos publicados.
- Decisão posterior do proprietário: o atendimento comercial usa **+55 47 99770-6454**; o número pessoal anteriormente usado nos CTAs destina-se apenas aos avisos privados. Os links da LP foram corrigidos no PR. Os dois destinos foram separados na configuração local; o telefone pessoal não é gravado no código ou em exemplos públicos.

## Evidências de homologação

Resultado final local: **24 verificações aprovadas, zero falhas**. Ver `qa/prospecting/homologation-report.json`. Incluem seis suítes do núcleo/runtime, oferta, regressões de leads/CRM/comercial/financeiro/dashboard/intake/equipe/operações/formulários, cinco provas Python, TypeScript e build do framework. Dados e transportes são fictícios, sem chamadas aos provedores.

Na etapa seguinte, **`pnpm build` agregado passou integralmente**, incluindo a nova suíte de avisos ao proprietário, regressões e os oito PDFs. As novas provas de concorrência mantêm uma entrada pendente sem consumir tentativas enquanto a conversa está ocupada e serializam dois envios ao mesmo destinatário. Preparação cancelada por takeover não é tratada como envio tentado. Tipos e demais gates foram revalidados após integrar os avisos internos.

As provas abrangem HMAC e replay; proprietário confiável; isolamento de conta; 100 tentativas concorrentes reservando dez destinatários; vinte contratos disputando uma vaga; revogação; limite de vinte respostas por destinatário/hora; timestamp original; tomada humana durante tentativa; recibo tardio preservado; timeout sem replay; simulações bloqueadas após mudança para modo real; prosa LLM sempre revisada; Pix sem aprovação e com valor diferente de R$200 bloqueado; tabelas financeiras intactas; backup do estado operacional por proprietário.

O teste HTTP contra **127.0.0.1** usou login fictício do plugin, D1 e R2 locais. Confirmou acesso anônimo/cross-origin negado, ativação real negada, simulação, handoff no CRM existente, saídas `simulated`, pausa humana e backup versão 8. A base local recebeu as migrações reais até 0014 (101 comandos no emulador). E-mail permaneceu pendente. Nenhuma migração remota foi aplicada.

Comandos reproduzíveis: `pnpm test:prospecting`, `pnpm test:commercial-runtime`, `pnpm test:offer-policy` e regressões de `package.json`. Requerem Node >=22.13 e Python como `python3`; o perfil Windows local usou o Python fornecido pelo ambiente sem alterar a aplicação. O build do framework foi executado separadamente do agregado `pnpm build`.

**Pendências de QA anteriores resolvidas:** Poppler portátil 26.09.0 foi obtido no workspace temporário e conferido pelo SHA-256 do [manifesto Scoop](https://github.com/ScoopInstaller/Main/blob/master/bucket/poppler.json). A comparação confirmou os oito PDFs, pixels/layout/fontes/texto Pix, sem alteração da baseline ou do motor. `.gitattributes` preserva os bytes LF dos três arquivos congelados em checkouts Windows; o Git não registra alteração nesses arquivos. O watcher de desenvolvimento ignora `work/`, evitando erro de arquivo temporário ocupado.

O painel foi inspecionado no navegador local em desktop e viewport de 390px: margens, cartões, formulário e fila ajustados ao padrão do CRM; nenhum overflow horizontal externo. Foram registrados/processados dados fictícios, conferido estado `Simulado`, assumido atendimento humano e salvos destinos privados distintos. Nenhuma chamada aos provedores. Capturas locais ficam em `outputs/homologacao/`, fora do Git.

Na LP, o [workflow 20](https://github.com/mathbrandscontato-wq/mathbrands-projeto-especial/actions/runs/39807554014) passou no commit `da9328b`: sete suítes, build, validação ESM e QA visual automatizada em nove larguras, zero overflow, zero violações graves de acessibilidade, quatorze capturas e uma submissão fictícia. Artefatos ficam no run por sete dias. O teste antigo esperava os valores anteriores; foi corrigido para o padrão aprovado e passou a abrir a resposta de pagamento antes de verificar seu texto. Também foi corrigida a afirmação de hospedagem sempre paga no FAQ. Não houve publicação ou submissão real.

Após corrigir o número comercial, o [workflow 21](https://github.com/mathbrandscontato-wq/mathbrands-projeto-especial/actions/runs/39817260707) também passou no commit `3b78ad3`.

## Configuração privada necessária

Credenciais ficam exclusivamente nos secrets da hospedagem. O endpoint de configuração exige proprietário, mesma origem e revisão. `account` é imutável para preservar histórico/cota: homologação fictícia usa **base local separada**. No teste oficial, cadastrar o `META_PHONE_NUMBER_ID` correto desde o início; não reutilizar a conta fictícia local.

| Serviço | Variáveis, sem valores |
| --- | --- |
| Vinculação | `COMMERCIAL_OWNER`, `META_PHONE_NUMBER_ID`, `META_WABA_ID` |
| Meta e webhook | `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `META_ACCESS_TOKEN` |
| IA | `OPENAI_API_KEY`, `COMMERCIAL_AI_MODEL` escolhido e aprovado |
| Pesquisa | `GOOGLE_PLACES_API_KEY`; fornecedor autorizado adicional para busca web |
| E-mail | `RESEND_API_KEY`, `COMMERCIAL_EMAIL_FROM` com domínio verificado |
| Job | `COMMERCIAL_JOB_SECRET`, `COMMERCIAL_SCHEDULER_ENABLED` |
| Gates externos | `COMMERCIAL_EXTERNAL_APPROVED`, `COMMERCIAL_ACTIVATION_REFERENCE`, `COMMERCIAL_ENVIRONMENT`, `COMMERCIAL_PRODUCTION_APPROVED` |
| Pix | `COMMERCIAL_PIX_VALIDATED`, `COMMERCIAL_PIX_REFERENCE`, `COMMERCIAL_PIX_PAYLOAD`, `COMMERCIAL_PIX_KEY` |
| Só homologação | `COMMERCIAL_ALLOW_SIMULATIONS=true`; ausente em produção |
| Relay na LP | `WHATSAPP_RELAY_ENABLED`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `COMMERCIAL_SITE_TOKEN` |
| Timer separado | `SCHEDULE_ENABLED`, `CRM_SITE_TOKEN`, `COMMERCIAL_JOB_SECRET` |

Configuração persistente: destinatário de avisos e verificação, calendário revisado com feriados aplicáveis, templates efetivamente aprovados, qualidade verificada, destinatários de teste permitidos, referências de ativação, orçamento diário global e limites de pesquisa. Defaults: `dryRun:true`, `killSwitch:true`. O painel mantém homologação; não dispensa os gates do servidor. Alterar a revisão da configuração invalida provedores já criados antes de nova reserva de custo; a oferta também é relida antes de cada chamada paga.

Avisos privados usam `commercialPhone` separado de `ownerNotificationPhone`; destinos iguais são recusados. `ownerNotificationsEnabled` começa desligado. Para habilitar, exigir `ownerNotificationVerified`, `ownerNotificationConsentRef`, `ownerNotificationsSince` e `ownerNotificationTemplate` efetivamente aprovado. O timestamp exclui negócios históricos; apenas contrato ativo com confirmação manual auditada e oportunidade fechada gera aviso. Conteúdo mínimo: referência e link privado, sem dados do cliente. O gate é específico para notificação interna e não transforma opt-in do proprietário em consentimento de prospecção nem consome cota de clientes. POST financeiro bem-sucedido aciona a reconciliação em segundo plano; job/filas também retomam pendências. Ver [contrato dos avisos](owner-notifications.md).

`POST /api/commercial-job` aceita somente `scheduledAt` e exige bearer; proprietário e configuração vêm do servidor. `worker/commercial-cron.mjs` usa URL privada fixa e template desativado. Cloudflare cron usa UTC: `30 13 * * *` corresponde atualmente a 10h30 São Paulo. Revalidar essa relação antes de habilitar. [Referência Cloudflare](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

## Limitações e custos

1. **Pesquisa:** Places não é busca web genérica; consultas `site:` são recusadas antes de cobrar. A biblioteca original permanece intacta. Resultados Google têm `persistenceAllowed:false`: apenas totais são guardados, sem nomes/IDs/conteúdo, até revisão de termos e fontes independentes permitidas. Falta homologar fornecedor para as demais consultas e evidências persistíveis. Deduplicação por aliases cobre 500 registros por padrão (máximo 2000), sinaliza limite e não faz fusões destrutivas.
2. **Agente:** toda prosa nova de LLM é rascunho para humano. Somente respostas determinísticas revisadas podem seguir automaticamente quando elegíveis. Não há promessa de LLM autônomo ou envio automático dos rascunhos personalizados de pesquisa nesta entrega.
3. **WhatsApp:** falta comprovar coexistência e continuidade do atendimento atual. Não ativar enquanto a tomada humana não estiver provada. O número permanece preservado.
4. **E-mail:** faltam provedor/domínio, verificação do destinatário e teste autorizado. Aceitação não significa entrega. Tentativa incerta não é reenviada cegamente.
5. **Fechamento:** `approve_closing` exige proprietário, briefing/capacidade e evento real de aceite vinculado à oportunidade ativa. O Pix oficial exige CRC/chave corretos e valor fixo R$200; `queue_pix` revalida gates. Comprovante não confirma pagamento; a conferência financeira continua no processo existente.
6. **Dados:** retenção/descarte e acesso dos provedores dependem de política aprovada. Esta branch não exclui registros.

Nenhuma chamada paga Meta/OpenAI/Google/Resend foi feita e nenhum plano foi contratado. O orçamento externo continua **R$0** até decisão do proprietário. Cada chamada exige estimativa conservadora positiva em milionésimos de real e reserva atômica antes da rede; falhas também consomem reserva. Orçamento zero bloqueia adaptadores. Estimativas não são faturas: usar tarifas/câmbio contratados e limites também nos provedores. Custos futuros dependem de modelo, consultas/campos, categoria Meta, volume, hospedagem/cron e e-mail. CI usa a franquia existente da conta; não foi comprada capacidade adicional.

## Sequência exata para ativar

1. Revisar PRs na ordem acima, considerando o QA visual/PDF concluído. Não fazer merge automático.
2. O proprietário conclui a confirmação de senha solicitada pela Meta; depois, conferir a criação autorizada do aplicativo de homologação e preparar ambiente oficial de teste separado com secrets e destinatários permitidos. Comprovar Meta/WABA/coexistência sem desconectar ou migrar o número; testar HMAC, acesso de serviço e pausa humana.
3. Homologar fontes/retencão de pesquisa, agente com revisão, calendário, orçamento e entrega de e-mail. Somente destinatários de teste autorizados recebem testes reais. A autorização geral de desenvolvimento não ativa campanha.
4. Após autorização específica de publicação, criar e conferir backup. Aplicar somente migrações aditivas pendentes, preservando as antigas. Alinhar oferta explicitamente a R$500 e sinal contratual R$200, preservando contratos/recebimentos históricos. Homologar consumidores do novo `depositPercent:null`.
5. Publicar CRM com pausa e dry-run; LP com relay desligado. Revalidar privacidade e formulário. Deploy Sites é produção, não ambiente implícito de teste.
6. Após GO, autorizar conexão/ativação, habilitar relay e cron em nuvem. Conferir relatório das 10h30 sem computador/Codex abertos. Abordagem exige elegibilidade comprovada; zero contatos autorizados significa zero mensagens.

**GO para homologação técnica:** implementação, testes locais e defaults sem rede. **NO-GO real:** qualquer pendência acima, oferta divergente, orçamento zero, qualidade desconhecida, calendário vencido, consentimento sem evidência ou tomada humana/entrega não provadas.

## Interrupção e rollback

Antes de publicação/migração autorizada, exportar snapshot privado e conferir hash/completude e restauração em banco separado. A versão 8 inclui `prospectingRecords`: configuração, consentimentos, conversas, inbox/outbox, handoffs, aprovações, custos, relatórios e cota da conta daquele proprietário. Alterações de consentimento/atendimento protegem o estado anterior e registram tentativa em auditoria privada. Backup não é importação genérica de rascunhos.

Em incidente, ligar kill-switch e desabilitar gates, relay e cron. Conciliar `sending`/`uncertain` antes de intervir; chamada aceita não pode ser desfeita. Reverter código para versão conhecida mantendo migrações aditivas. Não apagar ledger, opt-outs, IDs ou recibos. Se restauração for necessária, testar em base separada e conciliar eventos posteriores para não ressuscitar consentimento revogado nem duplicar envio/receita. Restaurar clientes/oportunidades antes dos handoffs. Segredos ficam fora do Git. Nenhum rollback foi executado em produção.
