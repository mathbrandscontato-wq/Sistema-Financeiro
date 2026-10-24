# Encaminhamento ao responsável por e-mail

Revisado em 24/10/2026. O interesse recebido pode criar ou reutilizar cliente e oportunidade no CRM, registrar tarefa/histórico de encaminhamento e preparar um aviso ao responsável. Isso não cria contrato, confirma pagamento ou envia Pix. O transporte Resend recebido em 22/10 e a prova integrada local descrita aqui são etapas distintas.

## Fila persistente e recuperação

`reconcileHandoffs` busca encaminhamentos pendentes do mesmo proprietário com oportunidade não arquivada. Em modo real, a origem precisa ser entrada real, sem marca de simulação. A chave da saída é `email:handoff:<evento>`, única por proprietário. Um registro que já possui saída, inclusive incerta, não é criado outra vez.

Os filtros de origem, oportunidade e saída existente são aplicados antes do limite da página. Assim, encaminhamentos antigos já enfileirados, simulados ou arquivados não impedem o processamento de avisos mais novos. Duas reconciliações continuam protegidas pela chave única. A mudança do destinatário não redireciona mensagens antigas automaticamente.

O destinatário deve estar verificado na configuração privada; o domínio/remetente definitivo e o plano gratuito também precisam de homologação. O runtime usa o adaptador oficial Resend, chave de idempotência estável e reserva global persistente de custo zero antes do HTTP. A cota de três tentativas por minuto mantém as demais entradas pendentes, sem consumir uma tentativa de despacho quando não houve acesso à rede. Uma falha de transporte incerta permanece para revisão, sem repetição automática.

HTTP 200 e ID do provedor significam aceitação. A interface mostra **Aceito pelo provedor**; não afirma entrega na caixa de entrada. Somente o teste individual anterior possui confirmação de entrega e recebimento pelo proprietário.

## Prova integrada local

`node qa/prospecting/handoff-email.mjs` aplica as migrações reais a SQLite temporário em memória e usa `commercialServices`, o CRM, a fila e o adaptador Resend existentes. Credenciais, proprietários, telefones e respostas HTTP são fictícios; qualquer rede real é bloqueada.

O cenário reproduziu o defeito antes da correção e passou depois dela. Doze encaminhamentos acumulados com e-mail ainda não verificado avançam em páginas de três, ignorando um registro simulado e um arquivado. Os doze pedidos de envio passam somente pelo transporte fictício, com cotas no ledger, chaves únicas e aceitação registrada. Também verifica repetição do evento, destino alterado/não verificado, pausa geral e resultado incerto sem novo envio. Contratos, pagamentos e histórico financeiro permanecem vazios.

Esta prova valida a composição local. Não verifica DNS, domínio definitivo, entrega real da fila, conta Meta ou publicação. O ambiente operacional continua pausado, sem marcar `ownerEmailVerified` como verdadeiro na conta real.
