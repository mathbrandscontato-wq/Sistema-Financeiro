# Markteam Automático V4: estado corretivo

Data: 16/10/2026. Pacote `4.0.0-dev.2`. **Desenvolvimento entregue com gates bloqueados; produção não autorizada.**
Fonte de negócio: Relatório Estratégico V2.1 final, conforme critérios do pacote recebido. O PDF confidencial não foi incluído no repositório.

## Identidade e limites
- Base auditada confirmada: `1aeccc8fb11c744a394b98fc82bb7a7e08a0f5a2`.
- `main` conferida: `6d18c9184c60961054373661e0c91d4b68f1b048`; PR #1 permanece draft, aberto e sem merge.
- Branch corretiva: `fix/markteam-v4-audit-hardening`, destino `feat/markteam-automatico-v4`.
- Candidato de código: `47bbe8a5dbabb472e81c3939be44e552e77b9804`. O SHA final com esta documentação e sua evidência são registrados no corpo do PR corretivo depois da execução, evitando SHA autorreferencial.
- Nenhum deploy, merge, migração real, mensagem externa ou recurso pago ativado.

## Implementado
- Aplicador conservador: oito blobs conferidos; `--check` antes de `--apply`; integridade dos 15 arquivos do pacote validada e selfcheck sintético aprovado.
- Cadência suspensa após negociação, intake, intenção explícita de conversa/orçamento e transições de resposta/decisão. Voltar para Aguardando resposta não revive a cadência antiga. Uma nova transição auditada de proposta inicia nova referência, sujeita a revisão humana.
- Desempate determinístico por timestamp e ID; não é prova de ordem física nem entrega de mensagem externa.
- Rótulo Atrasado tanto nas sugestões vencidas quanto na próxima ação já agendada. Datas persistidas não são reescritas. Relógio injetável nos testes e fuso America/Sao_Paulo.
- Analytics com DTO de resposta, mutações discriminadas e gráficos genéricos tipados; carregamento derivado da chave da requisição evita render com dados de filtros anteriores. Erros financeiros ausentes não viram recebimento inventado.
- Imports/variável sem uso removidos, sem desligar lint. Validação de contato permanece antes de qualquer gravação.
- Template PDF: apenas import e variável sem uso removidos. Hash do arquivo atualizado intencionalmente depois de baseline completa PASS antes/depois. Nenhum PNG, fonte, layout, QR/Pix ou cálculo foi substituído.
- Cinco suítes que liam a referência comercial passaram a carregar fixture artificial independente. As baselines PDF legadas permanecem inalteradas para comparação; não foram republicadas em logs ou no PR.
- Teste SQLite de falha no INSERT de histórico após UPDATE comprova rollback da revisão. Testes adicionais de follow-up integrados em `pnpm test:markteam` e no build.

## Evidência preliminar real
11 suítes nativas PASS, TypeScript PASS, lint do incremento PASS e build PASS em árvore de código estabilizada. Esses resultados não são CI do commit final. A execução sobre o SHA final será anexada ao PR e ao relatório privado.

**Lint global FAIL: 335 erros (328 no-explicit-any e 7 set-state-in-effect), 6 avisos.** A maioria está nos módulos financeiros/CRM legados. Refatorar toda essa árvore excede a correção segura sem homologação adicional. Não houve eslint-disable, relaxamento de configuração nem remoção de testes para ocultar falhas.

## Não verificável / gates
- UI: tentativa de QA local bloqueada por ausência de executável Chromium. Roteiro `node qa/markteam/ui-check.mjs` preparado, mas seus cenários não são PASS. Requer Playwright + navegador disponível; dependências do produto e lockfile não foram alterados.
- D1/R2 isolados, gateway e restauração reais: não executados; nenhum ambiente isolado com quotas comprovadas foi disponibilizado nesta tarefa.
- Headers `oai-authenticated-*`: aplicação confia no gateway; falta comprovar remoção de headers externos, injeção autenticada e bloqueio de acesso direto ao Worker. Não alegar proteção contra spoofing validada por testes locais.
- Opt-out: não existe estado persistente específico de oposição. Marketing=false não equivale a opt-out de atendimento. Resposta/recusa deve ser registrada no CRM e revisada por pessoa; nenhuma detecção automática de canal externo foi adicionada. Migração proposta exige autorização.
- Referência comercial pública: inventário privado por categorias, sem registros; exposição pré-existente confirmada na main. Visibilidade, histórico, forks e caches exigem decisão do proprietário.
- Múltiplas solicitações do mesmo contato/formulário continuam na mesma oportunidade. Não houve mudança de negócio ou migração.
- Cotas reais e billing das contas externas não aferidos. Nenhuma execução opcional externa, agendamento ou cobrança ativada.

P1/P2, scoring automático, Ritmo e mensagens externas continuam fora do incremento. Arquivo `Instrução.txt` não foi disponibilizado; não foi utilizado.
