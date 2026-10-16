-- Distribuição expressamente solicitada: microfone 120, tripé 60, iluminação 120.
-- Escopo: proprietário do planejamento existente. Preserva despesas, caixa e outras metas.
-- O documento inteiro anterior fica no histórico antes da atualização.
INSERT INTO operational_history(id,owner,action,data,created)
SELECT 'equipment-budget-300-20261011',owner,'investment_budget_allocation',json_object('before',json(data),'beforeRevision',revision,'totalCents',30000,'allocations',json('{"equipment_0":12000,"equipment_1":6000,"equipment_2":12000}')),strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM operational_state WHERE owner='oHht5YJCzHQhbLDPuNOvVYlzpFWqeE6RbYxewvh38KVlXoQCXD44EA' AND NOT EXISTS(SELECT 1 FROM operational_history WHERE id='equipment-budget-300-20261011');
--> statement-breakpoint
UPDATE operational_state SET data=json_set(data,'$.investments',json((SELECT json_group_array(json(CASE WHEN json_extract(value,'$.status')='Planejado' AND json_extract(value,'$.id') IN ('equipment_0','equipment_1','equipment_2') THEN json_set(value,'$.budgetCents',CASE json_extract(value,'$.id') WHEN 'equipment_1' THEN 6000 ELSE 12000 END,'$.notes',json_extract(value,'$.notes') || ' Teto do conjunto: R$ 300, incluindo frete e acessórios.') ELSE value END)) FROM json_each(operational_state.data,'$.investments')))),revision=revision+1,updated=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE owner='oHht5YJCzHQhbLDPuNOvVYlzpFWqeE6RbYxewvh38KVlXoQCXD44EA' AND EXISTS(SELECT 1 FROM operational_history WHERE id='equipment-budget-300-20261011' AND owner=operational_state.owner AND json_extract(data,'$.beforeRevision')=operational_state.revision);
