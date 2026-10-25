# Encaminhamento ao responsável por e-mail

Revisado em 24/10/2026. O interesse recebido pode criar ou reutilizar cliente e oportunidade no CRM, registrar tarefa/histórico de encaminhamento e preparar um aviso ao responsável. Isso não cria contrato, confirma pagamento ou envia Pix. O transporte Resend recebido em 22/10 e a prova integrada local descrita aqui são etapas distintas.

## Fila persistente e recuperação

`reconcileHandoffs` busca encaminhamentos pendentes do mesmo proprietário com oportunidade não arquivada. Em modo real, a origem precisa ser entrada real, sem marca de simulação. A chave da saída é `email:handoff:<evento>`, única por proprietário. Um registro que já possui saída, inclusive incerta, não é criado outra vez.

Os filtros de origem, oportunidade e saída existente são aplicados antes do limite da página. Assim, encaminhamentos antigos já enfileirados, simulados ou arquivados não impedem o processamento de avisos mais novos. Duas reconciliações continuam protegidas pela chave única. A mudança do destinatário não redireciona mensagens antigas automaticamente.

O destinatário deve estar verificado na configuração privada; o domínio/remetente definitivo e o plano gratuito também precisam de homologação. O runtime usa o adaptador oficial Resend, chave de idempotência estável e reserva global persistente de custo zero antes do HTTP. A cota de três tentativas por minuto mantém as demais entradas pendentes, sem consumir uma tentativa de despacho quando não houve acesso à rede. Uma falha de transporte incerta permanece para revisão, sem repetição automática.

HTTP 200 e ID do provedor significam aceitação. A interface mostra **Aceito pelo provedor**; não afirma entrega na caixa de entrada. Os dois testes individuais do proprietário possuem confirmação de entrega e recebimento, incluindo o posterior pela fila isolada com remetente próprio. Isso não transforma a aceitação de outros e-mails em prova de entrega.

## Prova integrada local

`node qa/prospecting/handoff-email.mjs` aplica as migrações reais a SQLite temporário em memória e usa `commercialServices`, o CRM, a fila e o adaptador Resend existentes. Credenciais, proprietários, telefones e respostas HTTP são fictícios; qualquer rede real é bloqueada.

O cenário reproduziu o defeito antes da correção e passou depois dela. Doze encaminhamentos acumulados com e-mail ainda não verificado avançam em páginas de três, ignorando um registro simulado e um arquivado. Os doze pedidos de envio passam somente pelo transporte fictício, com cotas no ledger, chaves únicas e aceitação registrada. Também verifica repetição do evento, destino alterado/não verificado, pausa geral e resultado incerto sem novo envio. Contratos, pagamentos e histórico financeiro permanecem vazios.

Esta prova valida a composição local. Não verifica DNS, domínio definitivo, entrega real da fila, conta Meta ou publicação. O ambiente operacional continua pausado, sem marcar `ownerEmailVerified` como verdadeiro na conta real.

## Prova real isolada com remetente próprio — 24/10/2026

Uma execução posterior usou a outbox, a reserva persistente de custo zero e o adaptador Resend reais em **outro SQLite isolado**, com exatamente um e-mail de teste ao proprietário. Houve um único POST, HTTP 200, uma saída aceita e uma reserva de custo zero. O painel mostrou o recibo correspondente como **Delivered às 17h55 de São Paulo**, e o proprietário confirmou o recebimento. Nenhum dado de cliente, conversa, oportunidade, contrato, pagamento ou histórico financeiro foi criado. O marcador exclusivo do teste impede repeti-lo.

Essa prova complementa a composição CRM/handoff com transporte fictício acima; não é um handoff originado no CRM publicado. Após a confirmação humana, somente a configuração privada do destinatário foi preparada como verificada, com backup consistente e conferência de que as outras tabelas não mudaram. Pausa e dry-run continuam ligados; produção e os envios operacionais permanecem desligados. Endereço do destinatário, recibo, banco e capturas ficam fora do Git.
