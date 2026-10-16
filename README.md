# Gerador de Orçamentos · Math Brands

Aplicação privada para propostas comerciais, baseada no orçamento aprovado enviado em 09/10/2026. Sem integração bancária ou com Google Drive.

## Arquitetura

- React/Vinext com rotas HTTP protegidas pela identidade fornecida pelo Sites.
- D1/SQLite: registros persistentes, configurações por usuário e trilha de auditoria.
- `lib/core.mjs`: regras comerciais, validação Pix/TLV/CRC e cálculo com Decimal.js.
- `lib/document.mjs`: layout independente dos dados. Uma lista comum de posições alimenta o template HTML/CSS e o PDF vetorial com Inter incorporada e QR Code vetorial. Apenas grafismo superior e logo são imagens extraídas da referência.
- `app/workspace.tsx`: dashboard, filtros, formulário, gerenciamento, configurações, backup/importação e confirmação manual de pagamentos.

## Fluxo

Criar orçamento → preencher cliente e serviços → visualizar → salvar → baixar PDF → registrar envio/aceite → confirmar pagamentos manualmente. O salvamento gera número único MB-ID. A emissão usa o calendário de São Paulo e a validade é um mês civil depois, limitada ao último dia do mês de destino.

## Estrutura de dados

`quotes`: id sequencial autoincremental, owner, documento JSON, revision, deleted, created, updated. Cada documento contém cliente, empresa, contatos opcionais, emissão/validade, serviços, desconto, condições, notas, status comercial, flag de cobrança, pagamentos e snapshot do emissor/Pix.

`settings`: owner e configurações padrão em JSON. Alterações valem para novos documentos.

`events`: id, quote_id, owner, ação, conteúdo antes/depois, data/hora. Exclusão é lógica; numeração e auditoria são preservadas. Atualizações usam revisão otimista e condicionam o evento ao sucesso da alteração.

## API interna

`GET /api/workspace`: registros, configurações e auditoria do usuário autenticado.

`POST /api/workspace`: `action` em create, save, settings, payment, reverse, delete, import. Atualizações exigem id e revision. Dados validados no servidor. Erros 400/401/404/409. Não há autenticação externa/API pública nesta versão.

## Regras financeiras

Linhas arredondadas a centavos com HALF_UP, somadas depois. Preço por pacote mantém o total e calcula unitário interno com 30 algarismos de precisão; unitários aproximados recebem asterisco. Descontos fixos ou percentuais, sem total negativo. Pagamentos positivos limitados ao saldo, com data e referência da confirmação manual. Alterações no orçamento não podem reduzir o total abaixo dos pagamentos.

Rascunhos ficam fora dos indicadores comerciais. Conversão = aprovados / emitidos. A receber = saldo positivo dos aprovados. Recebido = pagamentos manualmente registrados nos documentos filtrados. Filtros usam a data de emissão; não representam um relatório de fluxo de caixa por data de pagamento.

## Backup e importação

JSON versão 1 exporta registros ativos, configurações e auditoria. Importação de até 100 registros/1 MB cria novos rascunhos com números novos e configurações atuais, sem confirmar pagamentos ou restaurar automaticamente a auditoria/configurações. O arquivo exportado conserva esses dados para conferência e futura integração. Não é uma restauração destrutiva do banco.

## Limites e evolução

O PDF é gerado no dispositivo, sem serviços externos, captura de tela ou envio de dados a terceiros. Código Pix em uma linha para seleção e cópia integral. Fontes e assets locais. O custo do PDF carrega sob demanda.

Orçamentos longos são paginados; topo e rodapé continuam em cada página. O fluxo aceita até 50 serviços. Históricos e registros são carregados por usuário; paginação de API e índices adicionais serão necessários conforme o volume aumentar.

Integrações futuras: CRM, contratos, demandas, contas a receber, relatórios de caixa e Google Drive. Exigem contrato de API, autorização, controle de acesso e avaliação de viabilidade. Não implementadas.

## Validação

`node qa/check.mjs`: CRC/TLV/chave Pix, precisão monetária, pacote 60 × 500/60, descontos, validade em fim de mês/ano, indicadores, fonte e geração PDF de uma e várias páginas.

`python3 qa/database.py`: schema SQL, isolamento, sequência, exclusão lógica, concorrência e auditoria.

`pnpm exec tsc --noEmit`: tipagem.

PDFs de teste são temporários e não são registros comerciais. Inter é distribuída com sua licença SIL Open Font License.

A inspeção visual e a extração de texto do PDF são verificadas com Poppler/PyMuPDF; o QR é decodificado por um leitor independente. A validação do navegador não está disponível no ambiente desta execução. Confirmar usabilidade/mobile e seleção do código em seus leitores de PDF antes do uso comercial.
