# Markteam V4 — recuperação, privacidade e custos | gate de homologação

**Candidato**: `4.0.0-dev.2-rc.1`, branch `fix/markteam-v4-hardening-20261016`. **Produção intocada**; nenhuma restauração foi executada neste pacote.

## Rollback do código
1. Validar o SHA do PR draft e certificar que não há merge/deploy.
2. Se for preciso reverter somente a correção, fechar o PR ou preparar revert dos commits na branch corretiva. Nunca alterar `main` para este procedimento.
3. Não restaurar dados em produção por causa de correção de frontend/follow-up. Conferir os testes no mesmo SHA antes de retomar homologação.

## Restore de D1 e R2 (NÃO EXECUTADO)
1. Exigir ambiente de teste separado, credenciais de menor privilégio, snapshots próprios e sem dados pessoais reais.
2. Calcular checksum de cada objeto/manifesto e contagem de registros antes da exportação; registrar hora de início e checkpoint (para RPO).
3. Restaurar em identificadores **exclusivos de homologação**, conferir esquemas, contagens, hashes e invariantes de owner, tokens e mídia.
4. Medir tempo de restauração ponta a ponta (RTO), perda recuperável (RPO) e custo real/quota; interromper antes de eventual contratação ou cobrança.
5. Não declarar restore comprovado nem `releaseEligible` verdadeiro sem logs aferidos.

## Segurança de dados e autorizações
- Repo público contém arquivo de referência comercial preexistente na `main`. Categorias potencialmente restritas: nomes de clientes, valores, sinais, saldos e observações. Não copiar trechos em GitHub, PR, logs ou novas fixtures.
- Responsável deve decidir visibilidade pública/privada e eventual limpeza de histórico. Reescrita/force-push exigem janela autorizada, avaliação de clones/forks/caches e, se aplicável, avaliação LGPD.
- Sem testagem externa com dados reais antes da contenção. Guardar inventário detalhado em ambiente privado apropriado, fora do repositório público.
- Autenticação por gateway, role e isolamento de owner devem ser testados com requisições falsas no ambiente isolado.

## Quotas e custo adicional R$ 0
- Nenhuma dependência, API paga, serviço, storage ou runner contratado. CI utiliza workflow existente de testes no repositório público.
- Medir antes de liberar: minutos GitHub Actions, capacidade free-tier de D1/R2/Workers, volume/frequência de snapshots e logs. Se qualquer teto exigir gasto, abortar e solicitar autorização (padrão de custo adicional **R$ 0**).
- Quotas e cobrança reais não auditadas no provedor: status **NÃO VERIFICÁVEL**.

## Gate final
Produção, merge, publicação, migração, envio externo e alterações de visibilidade permanecem bloqueados. UI real, D1/R2 isolados, prova de restore e consentimento são pendências de homologação; cliente/proprietário decide política comercial e tratamento de dados.
