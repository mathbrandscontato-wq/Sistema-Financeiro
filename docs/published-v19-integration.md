# Preservação da versão publicada e preparação de implantação

Revisão de 25/10/2026. Esta etapa prepara o runtime sem ativar pesquisa, mensagens ou agendamento. Nenhum PR foi mesclado no GitHub e nenhum número real foi conectado.

## Fonte publicada conferida

O CRM privado estava na versão Sites 19, fonte `a290c7106e6030e4e1ddded64c50ca4f0a2844ca`, enquanto `main` do GitHub permanecia no espelho da versão 18. A árvore publicada foi obtida em diretório temporário separado, sem publicar por push. A comparação de blobs confirmou correspondência com `ea8847fc0443169021204d4ae8a49d60853d1c1a`, já existente no [PR #3](https://github.com/mathbrandscontato-wq/Sistema-Financeiro/pull/3). A única diferença era o documento histórico de autorização da publicação anterior.

Foi incorporado à branch da automação o commit existente no GitHub, preservando a história de ambos os trabalhos. A história privada do repositório Sites não foi importada para o GitHub. Os conflitos foram conciliados em cinco arquivos: telas de Analytics e workspace, estilos, store de formulários e scripts do projeto. Foram mantidos os tipos, tratamento de erros, classificação humana e follow-ups publicados, juntamente com Atendimento, pausa, custo zero e sinal contratual. Os contratos de tipos receberam o campo da política de sinal da migração 0011. O PR #3 e as bases dos PRs #4–#6 não foram alterados.

## Cópia atual e ensaio de migração

A leitura nativa inventariou 33 tabelas. Sete valores grandes vieram resumidos em quatro tabelas; essa coleta foi marcada **INCOMPLETE** e recusada como fonte de restauração. O backup oficial do CRM foi então criado e baixado, exibido em **24/10/2026 às 23h30 de São Paulo**. Seu modelo é versão 7, coerente com a aplicação publicada. O SHA-256 do arquivo foi comparado ao registro de proteção retornado pela base real.

Os registros completos desse proprietário e os metadados de proteção foram restaurados em SQLite privado separado: **33 tabelas, 193 registros e um proprietário**. A estrutura foi conferida com as migrações de base; todas as colunas e valores foram preservados. A única diferença observada entre a consulta inicial e o backup foi o acréscimo de auditoria de acesso. As migrações **0010–0015** foram executadas somente na cópia: criaram onze tabelas vazias e preservaram os valores anteriores das 33 tabelas. Integridade e chaves estrangeiras passaram. Oferta R$300 e política legada foram preservadas; contratos, pagamentos, histórico e referências dos PDFs não foram alterados.

Foram baixados e verificados **17 objetos referenciados**: dezesseis snapshots e um PDF original, cerca de 1,88 MB. Cada SHA-256 correspondeu aos metadados; o PDF não foi regenerado. Os arquivos foram reconstruídos localmente com as mesmas chaves de objeto, resolvendo todas as referências da base restaurada. O material privado permanece fora de OneDrive e do versionamento.

Esse ensaio não restaura produção, não é um snapshot físico atômico de todo o D1 e não inventaria objetos R2 sem referência ou todos os seus metadados. Não estabelece RTO/RPO nem recuperação integral de desastre. A regra de preservar o ledger global em recuperação futura continua válida; o banco publicado nesta conferência ainda não continha as tabelas de runtime. Ver [proteção e recuperação](protection-and-recovery.md).

## Validação da composição

Passaram as quatorze suítes de runtime, as quatro suítes Markteam, regras de oferta e prospecção, leads, proteção, CRM, financeiro, dashboard, intake, evolução, planejamento, formulários e concorrência. As três fixtures de PDF, com oito páginas, mantiveram pixels, layout, fontes e texto Pix. TypeScript, teste de portfólio e build do framework passaram. No Windows, os executáveis e temporários locais foram ajustados; a interrupção do agregado por diretório temporário foi seguida da execução bem-sucedida da última prova de concorrência e do build, sem alterar os testes ou a aplicação para ocultar a falha.

A prévia local com identidade fictícia conferiu o menu Atendimento, homologação, pausa geral, custo R$0 e horário das 10h30. Analytics manteve as opções de sinal legado e contratual, sem salvar configuração. O viewport de 1280 px não apresentou overflow externo. A requisição local sem contexto do navegador foi recusada com HTTP 403; isso não comprova a fronteira de autenticação hospedada. A prévia não foi conectada ao D1/R2 de produção; o ensaio com o backup real permaneceu em outra cópia privada. Nenhum envio externo foi feito por essas provas e a rotina permanece desligada.

## Condições preservadas para publicação pausada

Reutilizar o mesmo projeto, acesso exclusivo do proprietário, DB, BUCKET e variáveis existentes. A nova versão deve iniciar sem credenciais de provedores, pesquisa, relay, job ou envio habilitados. Não copiar as credenciais autorizadas apenas para homologação privada para produção. A implantação pausada não libera a restrição Meta 130497, a revisão de uso/retenção Tavily, coexistência, qualidade do agente, preço/Pix ou execução diária real. O recibo de versão e a verificação do estado publicado devem ser registrados separadamente após retorno da plataforma.
