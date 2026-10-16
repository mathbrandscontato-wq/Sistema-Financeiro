export const COMMERCIAL_TABLES=['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments','commercial_history','commercial_import_batches','commercial_import_rows','commercial_quote_links','commercial_client_history','financial_history','financial_quote_receipts','intake_forms','intake_sessions','intake_captures','intake_contact_keys','intake_lead_links','intake_rate_limits','intake_acquisition','workspace_members','workspace_access_history','payment_event_inbox','operational_state','operational_history','acquisition_config','acquisition_events','site_offers','offer_seats','offer_history'];
// Plans are pure SQL + parameters, shared by D1 and the SQLite regression tests.
export const identity = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const stableId = async (owner,kind,key) => kind+'-'+await digest(JSON.stringify([owner,kind,key]));
const amount = value => {if(!Number.isSafeInteger(value)||value<0||value>1000000000000)throw Error('Valor financeiro inválido na origem.');return value;};
export function validateSource(source){
 if(source.schemaVersion!==1||!source.namespace||!/^\w[\w-]{0,100}$/.test(source.namespace)||!(/^[a-f0-9]{64}$/.test(source.sourceSha256))||!Array.isArray(source.rows)||!source.rows.length||source.rows.length>100)throw Error('Origem de importação inválida.');
 const keys=new Set(),clients=new Set();
 for(const r of source.rows){if(!r.externalKey||keys.has(r.externalKey)||!r.client||!identity(r.client))throw Error('Identidade ausente ou duplicada na origem.');keys.add(r.externalKey);const key=identity(r.client);if(clients.has(key))throw Error('Clientes repetidos precisam de conciliação prévia.');clients.add(key);amount(r.amountCents);amount(r.depositCents);amount(r.sourceBalanceCents);if(r.depositCents>r.amountCents)throw Error('Recebimento supera o valor contratado.');if(!['Fechado','Acompanhamento','Aguardando resposta'].includes(r.stage))throw Error('Etapa comercial não mapeada.');if(!['confirmed','unknown'].includes(r.paymentKnowledge)||(r.depositCents>0&&(r.paymentKnowledge!=='confirmed'||r.paymentLabel!=='Sinal recebido'||r.stage!=='Fechado')))throw Error('Recebimento sem confirmação explícita.');if(r.paidOn&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.paidOn)||new Date(r.paidOn).toISOString().slice(0,10)!==r.paidOn))throw Error('Data de recebimento inválida.');if(r.sourceBalanceCents!==r.amountCents-r.depositCents)throw Error('O saldo da origem não concilia com valor e sinal.');}
 return source;
}
export function reconciliation(source){validateSource(source);const closed=source.rows.filter(r=>r.stage==='Fechado');const sum=(rs,k)=>rs.reduce((n,r)=>n+r[k],0);return {opportunities:source.rows.length,contracts:closed.length,contractedCents:sum(closed,'amountCents'),receivedCents:sum(closed,'depositCents'),pipelineCents:sum(source.rows.filter(r=>r.stage!=='Fechado'),'amountCents'),referenceBalanceCents:sum(closed,'sourceBalanceCents'),unknownPaymentContracts:closed.filter(r=>r.paymentKnowledge==='unknown').length,undatedPayments:closed.filter(r=>r.depositCents>0&&!r.paidOn).length};}
export async function planImport(owner,source,existing,now){
 validateSource(source);const statements=[],rows=[],conflicts=[],stats={newClients:0,newOpportunities:0,newContracts:0,newPayments:0,unchanged:0};
 const batchId=await stableId(owner,'import',source.namespace+':'+source.sourceSha256);
 const push=(sql,...args)=>statements.push({sql,args});
 for(const r of source.rows){const contentHash=await digest(JSON.stringify(r)),prior=existing.rows.find(x=>x.external_key===r.externalKey&&x.namespace===source.namespace);if(prior){if(prior.content_hash!==contentHash)conflicts.push({key:r.externalKey,client:r.client,reason:'A origem mudou. O registro existente foi preservado.'});else stats.unchanged++;continue;}
 const clientKey=identity(r.client),client=existing.clients.find(c=>c.identity_key===clientKey);const clientId=client?.id||await stableId(owner,'client',clientKey);
 // Same client/project/value may already have been registered manually: never silently duplicate it.
 const duplicate=existing.opportunities.find(o=>o.client_id===clientId&&identity(o.title)===identity(r.client)&&o.amount_cents===r.amountCents);
 if(duplicate){conflicts.push({key:r.externalKey,client:r.client,reason:'Já existe uma oportunidade compatível. Revise o vínculo antes de importar.'});continue;}
 const key=source.namespace+':'+r.externalKey,opportunityId=await stableId(owner,'opportunity',key),contractId=await stableId(owner,'contract',key),rowId=await stableId(owner,'source-row',key);
 const provenance=JSON.stringify({sourceName:source.sourceName,sourceSha256:source.sourceSha256,sheet:source.sourceSheet,row:r.row,referenceDate:source.referenceDate,...r});
 if(!client){stats.newClients++;push('INSERT INTO commercial_clients(id,owner,identity_key,display_name,segment,origin,created,updated) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner,identity_key) DO NOTHING',clientId,owner,clientKey,r.client,r.segment,r.origin,now,now);}
 push('INSERT INTO commercial_opportunities(id,owner,client_id,title,amount_cents,stage,project_stage,briefing,next_action,notes,reference_date,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',opportunityId,owner,clientId,r.client,r.amountCents,r.stage,r.projectStage,r.briefing,r.nextAction,r.notes,source.referenceDate,now,now);stats.newOpportunities++;
 if(r.stage==='Fechado'){push('INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,status,payment_knowledge,reference_date,created) VALUES(?,?,?,?,?,?,?,?)',contractId,owner,opportunityId,r.amountCents,'Confirmado na planilha',r.paymentKnowledge,source.referenceDate,now);stats.newContracts++;
 if(r.depositCents>0){push('INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,paid_on,reference_date,confirmation,evidence,created) VALUES(?,?,?,?,?,?,?,?,?)',await stableId(owner,'payment',key+':sinal'),owner,contractId,r.depositCents,r.paidOn,source.referenceDate,'Confirmação registrada na planilha',provenance,now);stats.newPayments++;}}
 push('INSERT INTO commercial_import_rows(id,owner,namespace,external_key,content_hash,opportunity_id,batch_id,source) VALUES(?,?,?,?,?,?,?,?)',rowId,owner,source.namespace,r.externalKey,contentHash,opportunityId,batchId,provenance);
 push('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) VALUES(?,?,?,?,?,?)',await stableId(owner,'history',key+':import'),owner,opportunityId,'Histórico importado',JSON.stringify({sourceRow:r.row,referenceDate:source.referenceDate,stage:r.stage,sourceSha256:source.sourceSha256}),now);
 rows.push({key:r.externalKey,opportunityId});
 }
 const report={...stats,conflicts,source:source.sourceName,sourceSha256:source.sourceSha256,referenceDate:source.referenceDate,reconciliation:reconciliation(source)};
 // Atomic commit with the batch last. A racing transaction must roll back on the same deterministic keys.
 if(statements.length)push('INSERT INTO commercial_import_batches(id,owner,namespace,source_sha256,source_name,source_document,report,created) VALUES(?,?,?,?,?,?,?,?)',batchId,owner,source.namespace,source.sourceSha256,source.sourceName,JSON.stringify(source),JSON.stringify(report),now);
 return {batchId,statements:conflicts.length?[]:statements,rows,report};
}
export function planQuoteLink(owner,opportunity,quote,existingLinks,now){
 if(!opportunity||opportunity.archived||opportunity.owner!==owner||!quote||quote.owner!==owner||quote.deleted)throw Error('Vínculo inválido.');
 const prior=existingLinks.find(l=>l.quote_id===quote.id||l.opportunity_id===opportunity.id);if(prior){if(prior.quote_id===quote.id&&prior.opportunity_id===opportunity.id)return [];throw Error('O orçamento ou oportunidade já possui um vínculo.');}
 return [{sql:'INSERT INTO commercial_quote_links(quote_id,owner,opportunity_id,created) VALUES(?,?,?,?)',args:[quote.id,owner,opportunity.id,now]},{sql:'INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) VALUES(?,?,?,?,?,?)',args:[crypto.randomUUID(),owner,opportunity.id,'Orçamento vinculado manualmente',JSON.stringify({quoteId:quote.id}),now]}];
}
