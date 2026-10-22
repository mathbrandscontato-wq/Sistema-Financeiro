# Homologação da política de sinal para reserva de vagas

Esta entrega depende do núcleo do PR #4 e permanece fora de produção.

## Problema e comportamento

A reserva de vagas sempre exigia 50% do contrato. Um contrato aprovado de R$ 500 com sinal de R$ 200 confirmado era bloqueado, pois R$ 200 corresponde a 40%.

A política passa a ser explícita por oferta:

- `legacy_50`: preserva a regra de pelo menos 50%, inclusive arredondamento de centavos. É o default da migração e de novas ofertas, preservando o comportamento atual.
- `contract_deposit`: exige o sinal registrado no contrato aprovado, estritamente positivo e não superior ao valor total. Se estiver ausente ou inválido, bloqueia a reserva. Não deduz versão da campanha pelo preço nem aplica um percentual global novo.

Na segunda política, contrato de R$ 500 com sinal aprovado de R$ 200 exige pelo menos R$ 200 em pagamentos do tipo Sinal, não estornados. Mantêm-se aprovação comercial, contrato ativo, isolamento por proprietário, limite global de vagas, idempotência e confirmação atômica.

## Configuração e API

O proprietário escolhe a regra em Aquisição → Gerenciar vagas e configurações, com motivo obrigatório e auditoria existente. Chamadas antigas de configuração que omitem `depositPolicy` preservam o valor atual. A API continua exigindo permissão `team.manage` e origem válida.

A mudança se aplica a todas as futuras confirmações e reativações daquela oferta, inclusive contratos históricos vinculados a ela. Vagas já ativas não são recalculadas ou excluídas. Conferir os contratos afetados antes de selecionar a nova regra.

O retorno público inclui `depositPolicy` e `depositTerms`. `depositPercent` permanece 50 no modo legado e passa a `null` no modo contratual, pois o valor vem de cada contrato. Consumidores externos/LP precisam ser homologados antes de selecionar o novo modo em produção.

Não se altera automaticamente o preço atual, o default histórico de R$ 300, contratos, pagamentos, chave Pix ou vagas existentes. Os valores R$ 500 / R$ 200 / R$ 300 serão configurados e conferidos no ambiente correto, após aprovação de ativação. A migração 0011 adiciona somente a coluna `site_offers.deposit_policy`.

## Evidências

- `node qa/offer-policy.mjs`: migração sobre oferta/contrato/pagamento anteriores, preservação dos dados, R$ 199,99/R$ 200, fallback legado, total ímpar, ausência/invalidade de sinal, pagamentos divididos, estornos, tipo incorreto, aprovação, isolamento, reativação e snapshots financeiros inalterados.
- `python qa/offer-policy-concurrency.py`: vinte contratos de R$ 500 com sinal de R$ 200 disputam uma vaga; exatamente uma reserva e nenhum pagamento alterado.
- `qa/forms-integration.mjs`: serviço real transpilado com SQLite, política legada inicial, configuração inválida, seleção auditada, contrato V7, resposta pública, preservação ao omitir campo e igualdade dos contratos/pagamentos antes/depois.
- `qa/forms-concurrency.py`: corrida legada preservada; conexão é fechada ao final para permitir limpeza no Windows.
- Verificação de tipos e regressão financeira/formulários executadas. Testes que chamam `python3` usam adaptação temporária ao Python disponível no Windows, fora do código publicado.

Não foram executados migração real em D1, seleção da política em produção, integração com banco, WhatsApp ou Pix. QA visual do painel e compatibilidade dos consumidores públicos permanecem para staging.

## Ativação e reversão

Após revisar os PRs, aplicar migrações em D1 de teste com backup e comparar contagens dos dados financeiros. Criar contrato fictício 50000/20000, registrar recebimento fictício no ambiente de teste, selecionar `contract_deposit` e conferir reserva, auditoria, painel e formulário. Homologar clientes da API para `depositPercent:null`.

Produção continua NO-GO enquanto as demais integrações do PR #4 estiverem pendentes. Não há mudança automática de política nem publicação. Se necessário, interromper novas reservas e reverter código mantendo a coluna e auditoria; revisar vagas já confirmadas antes de qualquer mudança de política. Não excluir pagamentos nem contratos para reverter.
