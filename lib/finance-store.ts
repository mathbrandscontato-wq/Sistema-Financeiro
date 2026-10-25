import type {DatabaseRows} from './db-types';
import type {MutationPlan,SQLStatement} from './service-types';
import type {FinanceRequest} from './service-types';
import {errorDetails} from './error-info.mjs';
import {env} from 'cloudflare:workers';
import {createProtectionSnapshot} from './protection';
import {CRMError} from './crm.mjs';
import {FINANCE_ACTIONS,eventId,validateContract,validatePayment,planContractCreate,planContractSave,planPayment,planReverse,planReview,planQuoteReceipt} from './finance.mjs';
export async function mutateFinance(owner:string,body:FinanceRequest){
 if(!env.DB||!env.BUCKET)throw new CRMError('A proteção dos dados está indisponível. Nenhuma alteração foi realizada.',503);
 if(!FINANCE_ACTIONS.includes(body.action))throw new CRMError('Ação inválida.');
 const db=env.DB,now=new Date().toISOString(),eid=await eventId(owner,body.mutationId);
 const find=async<K extends keyof DatabaseRows>(table:K,id:unknown)=>{if(typeof id!=='string'||id.length>120)throw new CRMError('Identificador inválido.');return db.prepare(`SELECT * FROM ${table} WHERE id=? AND owner=?`).bind(id,owner).first<DatabaseRows[K]>();};
 let input:unknown;
 switch(body.action){
 case 'contract_create':input={opportunityId:body.opportunityId,contract:validateContract(body.contract)};break;
 case 'contract_save':input={id:body.id,contract:validateContract(body.contract)};break;
 case 'payment_record':input={id:body.id,payment:validatePayment(body.payment)};break;
 case 'payment_reverse':input={id:body.id,paymentId:body.paymentId,reason:typeof body.reason==='string'?body.reason.trim():body.reason};break;
 case 'payments_review':input={id:body.id,note:typeof body.note==='string'?body.note.trim():body.note};break;
 case 'quote_receipt':input={id:body.id,quoteId:body.quoteId,quotePaymentId:body.quotePaymentId,existingPaymentId:body.existingPaymentId||null};break;
 }
 async function replay(){const history=await find('financial_history',eid);if(!history)return null;const data=JSON.parse(history.data);if(data.action!==body.action||JSON.stringify(data.input)!==JSON.stringify(input))throw new CRMError('Esta solicitação já foi confirmada com outro conteúdo. Recarregue os registros.',409);return {ok:true,id:history.contract_id,reused:true};}
 const previous=await replay();if(previous)return previous;
 let plan:MutationPlan|undefined;
 if(body.action==='contract_create')plan=await planContractCreate(owner,await find('commercial_opportunities',body.opportunityId),body.contract,body.mutationId,now);
 else{
  const row=await find('commercial_contracts',body.id);
  const payments=(await db.prepare('SELECT * FROM commercial_payments WHERE contract_id=? AND owner=?').bind(body.id,owner).all()).results;
  if(body.action==='contract_save')plan=await planContractSave(owner,row,body.revision,body.contract,payments,body.mutationId,now);
  if(body.action==='payment_record')plan=await planPayment(owner,row,body.revision,body.payment,payments,body.mutationId,now);
  if(body.action==='payment_reverse')plan=await planReverse(owner,row,body.revision,await find('commercial_payments',body.paymentId),body.reason,body.mutationId,now);
  if(body.action==='payments_review')plan=await planReview(owner,row,body.revision,body.note,body.mutationId,now);
  if(body.action==='quote_receipt'){
   if(!Number.isSafeInteger(body.quoteId)||body.quoteId!<=0)throw new CRMError('Orçamento inválido.');
   const quote=await db.prepare('SELECT * FROM quotes WHERE id=? AND owner=? AND deleted=0').bind(body.quoteId,owner).first();
   const link=await db.prepare('SELECT * FROM commercial_quote_links WHERE quote_id=? AND owner=?').bind(body.quoteId,owner).first();
   const mappings=(await db.prepare('SELECT * FROM financial_quote_receipts WHERE owner=?').bind(owner).all()).results;
   const existing=body.existingPaymentId?await find('commercial_payments',body.existingPaymentId):null;
   if(body.existingPaymentId&&!existing)throw new CRMError('Recebimento não encontrado.',404);
   plan=await planQuoteReceipt(owner,row,body.revision,quote,link,body.quotePaymentId,existing,payments,mappings,body.mutationId,now);
  }
 }
 await createProtectionSnapshot(owner,'Antes da operação financeira: '+body.action);
 try{const results=await db.batch(plan!.statements.map((s:SQLStatement)=>db.prepare(s.sql).bind(...s.args)));if(!results[0].meta.changes)throw new CRMError('O contrato mudou. Recarregue antes de salvar.',409);}
 catch(caught){const e=errorDetails(caught);const committed=await replay();if(committed)return committed;if(e instanceof CRMError)throw e;if(/constraint|unique/i.test(e.message||''))throw new CRMError('Conflito de registros. Recarregue para conferir. Nenhuma alteração parcial foi salva.',409);throw new CRMError('Não foi possível salvar a operação financeira.',503);}
 return {ok:true,id:plan!.id};
}
