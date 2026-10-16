# Sistema Financeiro da Math Brands

A área Planejamento abre por padrão para o proprietário. CRM, orçamentos, PDFs e recebimentos permanecem disponíveis. O sistema não movimenta dinheiro, compra produtos ou calcula tributos automaticamente.

## Dados e cálculo

Despesas são categorizadas, marcadas essenciais ou opcionais e recorrentes mensalmente, anualmente ou únicas. Os modelos iniciais para ChatGPT, Adobe, domínio, energia, internet e impostos possuem valores e datas desconhecidos. Microfone, tripé e iluminação são apenas planos sem valores inventados.

O caixa parte de uma conciliação manual ao fim de uma data: inclui todas as contas líquidas da empresa e a reserva separada. Recebimentos confirmados datados após essa data, até hoje em São Paulo, são acrescentados; saídas pagas posteriores são descontadas. Valores sem data, estornados ou futuros não entram. A conciliação deve incluir movimentos de outras origens, taxas bancárias, aportes e retiradas, e ser atualizada quando necessário.

A meta de reserva é o maior valor entre o mínimo informado e meses configuráveis de despesas essenciais recorrentes. Custos anuais são provisionados dividindo por 12. A reserva protegida é o maior valor entre a meta e o montante já separado. A configuração inicial usa três meses e trinta dias de contas futuras, ambas editáveis. É uma política de planejamento, não uma regra universal.

Teto para investir = máximo de zero e (caixa acompanhado − contas vencidas e previstas no horizonte − reserva protegida). O cálculo fica indisponível com custos ou datas incompletos, sem conciliação, sem confirmação da revisão ou sem base para reserva. Contas futuras e reserva são descontadas separadamente de forma conservadora. Nenhum contrato ainda a receber libera o teto. Os planos são avaliados em conjunto por prioridade, com desempate por nome. A data desejada de compra não garante disponibilidade futura.

As recorrências usam a data original para preservar o dia desejado em meses curtos. Uma ocorrência quitada não é repetida. Os pagamentos representam quitação integral manual da ocorrência; valores parciais devem ser conciliados antes. Confirmar compra registra saída real e conclui o plano. Estornar reabre o plano ou a ocorrência e conserva evidência. Alterar recorrência ou vencimento pode alterar as ocorrências previstas: conferir histórico antes de editar.

## Proteção

Dados persistidos em operational_state, segregados por owner; histórico em operational_history. Todas as gravações exigem finance.write, origem do próprio Site, revisão otimista e chave idempotente. Proteção D1/R2 antes das operações e snapshot com modelo 7 inclui as duas tabelas. Migração 0007 aditiva. Exportação JSON na própria área. Valores em centavos inteiros.

Validação: TypeScript, regressões de orçamento/PDF/CRM/financeiro/dashboard/captação/equipe e qa/operations/check.mjs com SQLite real. Limite: QA visual no navegador não disponível neste ambiente.

## Teto de equipamentos aprovado em 11/10/2026

R$ 300 no conjunto: R$ 120 microfone, R$ 60 tripé, R$ 120 iluminação. Inclui frete e acessórios no teto de cada item. A migração de dados 0008 é limitada ao proprietário e aos três planos iniciais ainda planejados; conserva o documento anterior no histórico e não altera caixa, despesas ou compras já realizadas. Estes valores são limites de pesquisa, não cotações de produtos.
