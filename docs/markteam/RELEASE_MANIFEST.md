# Manifesto corretivo Markteam 4.0.0-dev.3

Data: 16/10/2026. `releaseEligible: false`. **Não publicar nem fazer merge.**

## Proveniência
| Item | Referência |
| --- | --- |
| Repositório | mathbrandscontato-wq/Sistema-Financeiro |
| Base auditada | 1aeccc8fb11c744a394b98fc82bb7a7e08a0f5a2 |
| Main preservada | 6d18c9184c60961054373661e0c91d4b68f1b048 |
| Candidato de código | edaa308d07fef2209a3d669495c3aa2dbb20ad7d |
| Branch / base do PR draft | fix/markteam-v4-audit-hardening / feat/markteam-automatico-v4 |
| SHA final e evidência | Corpo do PR corretivo após todos os commits; relatório privado |

`FILE_INTEGRITY.json` registra hashes reproduzíveis dos arquivos de código/QA modificados. Não inclui dados comerciais, segredos nem o próprio manifesto. A documentação posterior não autoriza reutilizar testes de outro HEAD.

## QA reproduzível no candidato final
Executar `pnpm install --frozen-lockfile`, as 11 suítes `test:markteam`, `test:leads`, `test:protection`, `test:commercial`, `test:crm`, `test:finance`, `test:dashboard`, `test:intake`, `test:evolution`, `test:operations`, `test:forms`, `pnpm exec tsc --noEmit`, `pnpm lint` e `pnpm build`. Registrar SHA antes e depois, exit code, duração e hash de cada log. Lint global deve passar sem supressão; dois avisos de img permanecem informativos. Os 335 erros legados foram corrigidos nesta continuação; executar novamente no SHA final.

Antes da limpeza do template: baseline PDF PASS em três fixtures e oito páginas. Depois: pixels idênticos, mesmo layout, Inter incorporada, texto Pix íntegro, CRC e centavos válidos. Hash anterior de document.mjs `f0007e32c9847888dea779654f81c744304c5cb1af46b40a040e5fffca2edbf0`; atual `0bc2fbd1b1bec8b7b43b1e872a857e43e2324ced0fd8dbf2f0c945278eb40580`. Hash do core e todos os ativos/PNGs preservados.

## Recuperação sem publicação (esta etapa)
Abandonar/fechar o PR corretivo ou reverter seus commits na branch corretiva, preservando os logs. A referência de retorno é a base auditada acima. Isso não restaura aplicações publicadas e não altera a produção. Nenhuma migração ou variável de runtime nova precisa ser revertida.

## Runbook para uma futura homologação separada (não executado)
1. Confirmar conta, plano, quotas, dono do ambiente e IDs de D1/R2 exclusivamente de teste. Nenhum binding de produção. Não criar recurso se custo gratuito não puder ser garantido.
2. Registrar SHA anterior, configuração sem segredos, schema, contagens/chaves e hashes do snapshot com dados artificiais. Inventariar cada objeto R2 e seu hash. Não exportar dados reais.
3. Restaurar SQL e objetos em recursos de teste separados. Conferir contagens, hashes, integridade referencial, autenticação, leitura e escrita. Injetar falha e repetir a restauração.
4. Medir RTO de ponta a ponta e RPO pelo snapshot. Não preencher números presumidos: **RTO/RPO não medidos nesta etapa**.
5. Só após autorização de release, definir mecanismo de retorno de código/configuração/banco/objetos com versões anteriores reais. Não executar por este pacote.

## Custos observados e limites
| Recurso | Ação nesta tarefa | Medição externa / gate |
| --- | --- | --- |
| Dependências | Lockfile congelado, cache local; nenhuma nova dependência de produto | Node 24.19.0, pnpm 11.25.0 |
| QA e build | Execução local, SQLite temporário, sem chamadas faturadas | Logs por comando |
| GitHub | Objetos Git + branch corretiva + PR draft | Workflow existente só dispara na branch original; nenhum novo run solicitado |
| Cloudflare D1/R2/Workers | Nenhum recurso, deploy, snapshot ou chamada real criado por esta tarefa | Cotas, storage e uso da conta não aferidos |
| APIs / mensagens / IA | Nenhuma ativação ou envio | Custo novo contratado R$ 0 |

Antes de qualquer operação externa: medir requisições/CPU, leituras/escritas/storage D1, bytes/retenção/operações R2 e minutos/runner/armazenamento GitHub. Se não houver trava contra gasto adicional, não executar. Um alerta de quota não garante teto financeiro. Política operacional permanece sem novos serviços ou consumo pago.

## CI / tag
O workflow existente foi inspecionado e preservado, sem deploy. Ele não cobre a branch corretiva; CI remoto permanece pendente e não é substituído por evidência de execução anterior. Identidade imutável desta entrega é o SHA final do PR. Tag anotada remota não foi criada nesta etapa; não declarar release enquanto a homologação estiver bloqueada.


## Continuação dev.3
Tipagem global e ciclo de carregamento corrigidos. Nenhuma expressão SQL prepare foi alterada em relação à dev.2; engines puros, schema, contratos reais, PDF e ativos preservados. Executar também `node qa/markteam/boundary-check.mjs` e `node qa/portfolio-check.mjs` no candidato final. `test:markteam` inclui a nova verificação de fronteiras.

Chromium: download de teste falhou por arquivo truncado; instalação não concluída e QA de navegador não liberado. Não foi contratado navegador remoto nem criada hospedagem de homologação. Logs completos de cada comando, exit code, duração e hash ficam no pacote privado e o resumo do mesmo SHA no PR #3. Main, branch de desenvolvimento e PR #1 permanecem intocados.
