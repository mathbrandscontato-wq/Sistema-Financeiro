# Diagnóstico: resultado e intenção comercial V2

Atualização de 12/10/2026. Perguntas e versão do formulário permanecem iguais; `rulesVersion: 2` identifica resultados novos. Resultados históricos não são reescritos.

O resultado apresenta conclusão, respostas que a sustentam, caminho recomendado e próximo passo. Falta de identidade sugere criação, não rebranding. Mudança de direção ou desalinhamento relatado sugere avaliar rebranding, sem prometer necessidade definitiva. Contradições exigem esclarecimento. Prazo de investimento altera a abordagem, nunca a conclusão técnica.

`POST /api/diagnostico` público encaminha `action: intent`, `sessionId`, `token` e `intent: quote | conversation` ao serviço privado `/api/intake`. Exige sessão válida com captura concluída. Retorna somente `{ok:true}`, nunca dados do CRM. Mantém proteção de origem, autenticação de serviço e limite de requisições.

Reutiliza captura e oportunidade existentes, sem migration. Um identificador estável por sessão e intenção impede duplicação em retries. Uma transação atualiza intenção/próxima ação e registra histórico. Oportunidades fechadas, recusadas ou arquivadas recebem apenas o histórico, sem reabertura. Não cria proposta enviada, contrato, pagamento, receita ou uma segunda conversão em lead.

Solicitar orçamento: confirmar escopo e preparar proposta. Conversar: esclarecer diagnóstico pelo WhatsApp já informado. Ambas são solicitações de retorno, não envio automático de mensagem.

Testes em `qa/intake/check.mjs`: recomendação independente de intenção, persistência, repetição, associação ao lead, token, proprietário, captura obrigatória, validade de sessão e ausência de contratos/pagamentos. Gateway público testa os dois CTAs e preservação do diagnóstico.

Restauração: frontend anterior `8131f5ef2eaff37fd30287a3d8e7d58e84b94126`; backend anterior `f70955f8477c75a8c2a0f10508e4db5cb0b6172a`. Publicar backend antes do frontend; em reversão, restaurar frontend primeiro. Históricos já gravados permanecem compatíveis. Sem verificação visual em navegador neste ambiente.
