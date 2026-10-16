# Evolução final: aquisição, equipe e API financeira limitada

## Captura de contato

O resultado conserva o formulário de atendimento visível abaixo do diagnóstico. Nome e empresa são obrigatórios. O visitante deve informar pelo menos WhatsApp ou e-mail e preencher o canal preferido. Instagram e site são opcionais, validados e preservados no novo cadastro e no histórico do pedido. Links não substituem o contato. Em clientes existentes, os novos links ficam no histórico, sem sobrescrever dados anteriores. A autorização promocional segue separada e desmarcada.

## Aquisição

CRM → Diagnósticos e menu Aquisição mostram inícios medidos, resultados, pedidos e leads únicos, por período, origem, campanha e conteúdo. Links aceitam `utm_source`, `utm_medium`, `utm_campaign` e `utm_content`, com códigos curtos sem dados pessoais.

O período é uma coorte pela data de início em America/Sao_Paulo. Quando o início não existe, usa a data do resultado. A conclusão usa somente resultados cujo início foi medido. Ganhos e perdas são o estado atual das oportunidades vinculadas; pedidos repetidos não viram leads distintos. Um início sem conclusão pode ser retomado e não prova abandono. A medição começa nesta versão. Registros de resultados antigos disponíveis foram incorporados sem inventar inícios. A tabela de aquisição não contém nome, telefone, e-mail, IP bruto ou respostas, mas mantém identificador aleatório, hash do token e vínculo interno da oportunidade.

## Equipe

Configurações → Equipe permite cadastrar, revogar e reativar perfis por e-mail da conta ChatGPT. O proprietário mantém controle integral. Marketing consulta aquisição; Comercial opera CRM e orçamentos; Financeiro opera contratos e recebimentos e consulta propostas. As APIs validam cada permissão no servidor, usam o proprietário da operação como escopo e registram a identidade de quem solicitou mudanças. Tentativas são identificadas como tal; históricos de negócio registram a efetivação.

Cadastrar uma permissão NÃO envia convite nem muda a audiência do Site. O membro precisa também de acesso concedido na política privada do Sites. Nenhuma pessoa foi convidada nesta atualização. O proprietário pode atribuir oportunidades a si ou a membros comerciais ativos. Revogar um membro preserva a atribuição histórica, mas impede novas atribuições ao perfil inativo.

## API futura de pagamentos

`POST /api/payment-events` recebe somente eventos `deposit` e `final`. A recepção externa fica desativada enquanto `PAYMENT_EVENTS_SECRET` não estiver configurado. Para acesso de serviço ao Site privado também é exigido o token de acesso da hospedagem, enviado como `OAI-Sites-Authorization`, separado do `Authorization: Bearer` do módulo. Não foi criada nem conectada integração com a Ritmo.

Payload de referência (dados fictícios):

```json
{"eventId":"00000000-0000-4000-8000-000000000001","contractId":"id-da-contratacao","type":"deposit","amountCents":7500,"paidOn":"2026-10-10","source":"sistema-origem"}
```

O evento deve identificar uma contratação ativa, ter valor inteiro positivo em centavos e data real não futura. Fonte + eventId identificam um reenvio: conteúdo igual reutiliza o registro; conteúdo diferente gera conflito. Receber um evento cria uma pendência, nunca receita nem confirmação bancária.

No Financeiro, o usuário autorizado informa a conferência e decide: confirmar novo recebimento; vincular um pagamento existente de mesmo contrato, valor e data; ou rejeitar. A quitação nova deve equivaler ao saldo; o sinal deve respeitar o saldo. Registros concorrentes têm reserva da decisão. Uma falha depois da gravação financeira mantém a decisão em processamento; repetir a mesma confirmação recupera o resultado sem duplicar pagamento. Recebimentos e estornos seguem no Financeiro normal. Eventos antigos e rejeitados permanecem como evidência.

Ativar uma integração exige definir direção da troca, fonte, autenticação e identificadores compartilhados. Nenhum segredo está no Git, PDF ou navegador. Esta API não confirma Pix estático.

## Migração, recuperação e verificação

Migração 0006 aditiva: links nos clientes, responsável nas oportunidades, tabela de aquisição, membros, auditoria de acesso e caixa de eventos. O backup passa a `dataModelVersion: 6` e inclui todas essas tabelas. Recuperar membros e auditoria; clientes antes de oportunidades, contratos e pagamentos antes da caixa de eventos. Preservar audiência privada, `INTAKE_OWNER` e segredos de runtime. Não remover tabelas nem aplicar a importação de rascunhos como restauração.

Os testes cobrem permissões e revogação, links inválidos, duplicidade, taxas de aquisição, conferência após falha financeira, backup e integridade dos PDFs. Navegação visual em computador e celular depende da disponibilidade do controlador de navegador indicado pela skill Sites.
