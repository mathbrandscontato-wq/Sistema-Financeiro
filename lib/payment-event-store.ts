import {env} from 'cloudflare:workers';
import {CRMError} from './crm.mjs';
import {paymentEvent} from './payment-events.mjs';
import {stableId} from './commercial-import.mjs';
import {createProtectionSnapshot,sha256} from './protection';
import {mutateFinance} from './finance-store';
export async function receivePaymentEvent(req:Request){
 if(!env.PAYMENT_EVENTS_SECRET||!env.INTAKE_OWNER)throw new CRMError('Recepção externa desativada.',503);
 const supplied=req.headers.get('Authorization')||'';if(await sha256(new TextEncoder().encode(supplied))!==await sha256(new TextEncoder().encode('Bearer '+env.PAYMENT_EVENTS_SECRET)))throw new CRMError('Acesso não autorizado.',401);
 const raw=await req.text();if(raw.length>4000)throw new CRMError('Evento muito grande.',413);const input=paymentEvent(JSON.parse(raw)),owner=env.INTAKE_OWNER,id=await stableId(owner,'external-payment',input.source+':'+input.eventId),payload=JSON.stringify(input);
 const prior=await env.DB!.prepare('SELECT payload,state FROM payment_event_inbox WHERE owner=? AND id=?').bind(owner,id).first<any>();if(prior){if(prior.payload!==payload)throw new CRMError('Identificador repetido com outro conteúdo.',409);return {ok:true,reused:true,state:prior.state};}
 const contract=await env.DB!.prepare('SELECT id FROM commercial_contracts WHERE owner=? AND id=? AND active=1').bind(owner,input.contractId).first();if(!contract)throw new CRMError('Contratação não encontrada.',404);
 await createProtectionSnapshot(owner,'Antes de receber evento financeiro pendente');await env.DB!.prepare('INSERT INTO payment_event_inbox(id,owner,event_id,source,contract_id,payload,state,created) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,input.eventId,input.source,input.contractId,payload,'pending',new Date().toISOString()).run();
 const committed=await env.DB!.prepare('SELECT payload,state FROM payment_event_inbox WHERE owner=? AND id=?').bind(owner,id).first<any>();if(committed.payload!==payload)throw new CRMError('Identificador repetido com outro conteúdo.',409);return {ok:true,state:committed.state};
}
export async function reviewPaymentEvent(owner:string,actor:string,input:any){
 const row=await env.DB!.prepare('SELECT * FROM payment_event_inbox WHERE id=? AND owner=?').bind(input.id,owner).first<any>();if(!row)throw new CRMError('Evento não encontrado.',404);
 if(!['confirm','reject','link'].includes(input.action)||typeof input.note!=='string'||!input.note.trim()||input.note.length>1000)throw new CRMError('Informe a decisão e a conferência realizada.');
 const data=JSON.parse(row.payload),intent=JSON.stringify({action:input.action,note:input.note.trim(),paymentId:input.paymentId||null});
 if(!['pending','processing'].includes(row.state)){if(row.review!==intent)throw new CRMError('Evento já conferido com outra decisão.',409);return {ok:true,reused:true};}
 // Stable mutation makes a retry after a crash reuse the same ledger event.
 const hex=(await stableId(owner,'payment-event-review',row.id)).slice(-32),mutationId=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 await createProtectionSnapshot(owner,'Antes de conferir evento financeiro externo');
 const claim=await env.DB!.prepare("UPDATE payment_event_inbox SET state='processing',review=? WHERE owner=? AND id=? AND state='pending'").bind(intent,owner,row.id).run();if(!claim.meta.changes){const locked=await env.DB!.prepare('SELECT state,review FROM payment_event_inbox WHERE owner=? AND id=?').bind(owner,row.id).first<any>();if(locked.state!=='processing'||locked.review!==intent)throw new CRMError('Evento em conferência ou já conferido por outra sessão.',409);}
 let ledgerCommitted=false;try{
 if(input.action==='confirm'){
  const c=await env.DB!.prepare('SELECT revision FROM commercial_contracts WHERE owner=? AND id=?').bind(owner,row.contract_id).first<any>();
  await mutateFinance(owner,{action:'payment_record',id:row.contract_id,revision:c.revision,mutationId,payment:{amount:(data.amountCents/100).toFixed(2),paidOn:data.paidOn,kind:data.type==='deposit'?'Sinal':'Quitação',note:input.note.trim()+' · origem '+data.source+' · evento '+data.eventId}});
 ledgerCommitted=true;
 }else if(input.action==='link'){
  const payment=await env.DB!.prepare('SELECT * FROM commercial_payments WHERE owner=? AND contract_id=? AND id=? AND reversed_on IS NULL').bind(owner,row.contract_id,input.paymentId).first<any>();if(!payment||payment.amount_cents!==data.amountCents||payment.paid_on!==data.paidOn)throw new CRMError('Escolha um recebimento existente com o mesmo valor e data.');
  const other=await env.DB!.prepare('SELECT id FROM payment_event_inbox WHERE owner=? AND payment_id=? AND id<>?').bind(owner,input.paymentId,row.id).first();if(other)throw new CRMError('Este recebimento já corresponde a outro evento.',409);
 }
 const paymentId=input.action==='confirm'?await stableId(owner,'finance-payment',mutationId):input.action==='link'?input.paymentId:null;
 const now=new Date().toISOString();const result=await env.DB!.batch([env.DB!.prepare('UPDATE payment_event_inbox SET state=?,review=?,reviewed_on=?,payment_id=? WHERE owner=? AND id=? AND state=?').bind(input.action==='reject'?'rejected':'confirmed',intent,now,paymentId,owner,row.id,'processing'),env.DB!.prepare('INSERT INTO workspace_access_history(id,owner,actor,action,data,created) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),owner,actor,'Evento externo conferido',JSON.stringify({event:row.id,decision:input.action,note:input.note.trim()}),now)]);if(!result[0].meta.changes){const committed=await env.DB!.prepare('SELECT review FROM payment_event_inbox WHERE owner=? AND id=?').bind(owner,row.id).first<any>();if(committed.review!==intent)throw new CRMError('Evento já conferido com outra decisão.',409);}return {ok:true};
 }catch(e){if(!ledgerCommitted)await env.DB!.prepare("UPDATE payment_event_inbox SET state='pending',review=NULL WHERE owner=? AND id=? AND state='processing' AND review=?").bind(owner,row.id,intent).run();throw e;}
}
