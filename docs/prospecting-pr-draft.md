# Núcleo offline de prospecção comercial com políticas e provas de segurança

Base: `main`. Branch: `feat/commercial-automation-offline`.

O CRM já possui clientes, oportunidades, captação e financeiro, mas não tem um núcleo de pesquisa diária e controle de contatos. Esta entrega adiciona uma fila de pesquisa no mesmo D1/SQLite, biblioteca original dos 15 mercados/90 buscas, classificação com evidências, execução idempotente e reserva atômica de até dez novos destinatários por conta/dia.

O funcionamento permanece exclusivamente offline: provedor mock, simulador conversacional, rascunho de e-mail, verificação HMAC e eventos comerciais com aprovação humana. Nenhum envio, conexão do número, scheduler em produção ou alteração financeira está habilitado. Pesquisa não cria clientes interessados. A migração é aditiva, gerada pelo Drizzle com snapshot.

Validação: nova suíte e prova de 100 tentativas concorrentes/20 conexões aprovadas; TypeScript aprovado; 12 suítes legadas aprovadas com adaptação temporária de ambiente onde necessário. Proteção visual de PDFs depende de Poppler; teste legado de concorrência de formulários conclui as asserções mas falha na limpeza de SQLite no Windows. Build e integrações reais não confirmados.

Antes de produção: corrigir conflito entre regra atual de sinal >=50% para vagas e oferta aprovada de 40%; auditar default antigo de oferta; homologar consentimentos persistentes, provedor de pesquisa, calendário, scheduler em nuvem, WABA/coexistência, webhooks, atendimento humano e e-mail. Detalhes, custos pendentes, GO/NO-GO e rollback em `docs/prospecting-homologation.md`.
