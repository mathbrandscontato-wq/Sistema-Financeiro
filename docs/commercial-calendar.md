# Calendário comercial de Joinville — 2026

Revisado em **23/10/2026**, com validade até **31/12/2026**, usando o [calendário municipal oficial](https://www.joinville.sc.gov.br/publicacoes/calendario-de-feriados-e-pontos-facultativos-do-municipio-de-joinville-2026/) e a [versão compilada do decreto estadual](https://leis.alesc.sc.gov.br/ato-normativo/53811/compilado). O arquivo [commercial-calendar-joinville-2026.json](../data/commercial-calendar-joinville-2026.json) contém o objeto `calendar` compatível com a configuração existente, acompanhado de origem e escopo territorial.

As treze datas incluem os feriados municipais e nacionais informados pela Prefeitura e a Data Magna estadual, transferida de 11/08 para o domingo seguinte, **16/08/2026**. Corpus Christi é feriado municipal em Joinville. Os pontos facultativos do serviço público, inclusive o recesso e 30/10, não definem automaticamente o expediente da Math Brands e não foram incluídos como feriados.

O objeto `calendar` está preparado para revisão/aplicação explícita na conta de Joinville. Não há carregamento automático nem alteração de configurações publicadas. Outra cidade ou exercício exige nova conferência. Ao ultrapassar `reviewedThrough`, a política existente bloqueia abordagens proativas e deixa de propor follow-ups que ultrapassem a validade.

O painel de homologação oferece **Aplicar calendário revisado de Joinville — 2026**, desmarcado por padrão. Ao marcar e salvar, usa o objeto versionado, mostra a validade salva e mantém dry-run, pesquisa pausada e custo zero. Se não marcar, preserva o calendário existente. As fontes oficiais ficam acessíveis ao lado da escolha. A ação não publica a configuração ou ativa contatos.

O calendário complementa as regras existentes: dias úteis, **9h às 17h em São Paulo**, consentimento, qualidade, pausa humana e elegibilidade antes de cada envio. Ele não libera mensagens. No modo de custo zero, templates continuam bloqueados e texto exige janela gratuita aberta por mensagem real. Respostas de atendimento dentro dessa janela não passam a ser abordagens proativas por causa do calendário.

A pesquisa mantém a agenda independente de **10h30 todos os dias**, inclusive fins de semana e feriados. Preparar datas não cria cron hospedado nem comprova execução sem o computador ligado.

A suíte `qa/prospecting/calendar.mjs` cobre o arquivo revisado, os treze feriados, horários, transferência estadual, pontos facultativos não aplicados, retornos combinados, vencimento e independência da pesquisa diária. Integra `pnpm test:commercial-runtime`.
