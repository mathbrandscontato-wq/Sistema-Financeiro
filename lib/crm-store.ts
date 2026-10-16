import {env} from 'cloudflare:workers';
import {createProtectionSnapshot} from './protection';
import {stableId} from './commercial-import.mjs';
import {CRMError,validateMutationId,validateClient,validateOpportunity,validateNegotiation,planCreateClient,planSaveClient,planCreateOpportunity,planSaveOpportunity,planArchive,planNegotiation} from './crm.mjs';
export const CRM_ACTIONS=['create_client','save_client','archive_client','create_opportunity','save_opportunity','archive_opportunity','negotiation'];
export async function mutateCRM(owner:string,body:any){
 if(!env.DB||!env.BUCKET)throw new CRMError('A proteção dos dados está indisponível. Nenhum registro foi alterado.',503);
 const db=env.DB,now=new Date().toISOString(),action=body.action;
 if(!CRM_ACTIONS.includes(action))throw new CRMError('Ação inválida.');
 const find=async(table:string,id:any)=>{if(typeof id!=='string'||id.length>120)throw new CRMError('Registro inválido.');return db.prepare(`SELECT * FROM ${table} WHERE id=? AND owner=?`).bind(id,owner).first<any>();};
 let retryId:string|null=null,retryTable:string|null=null,retryParent:string|null=null,retryInput:any=null;
 if(action==='create_client'||action==='create_opportunity'||action==='negotiation'){
  validateMutationId(body.mutationId);
  if(action==='create_client'){retryId=await stableId(owner,'crm-client-create',body.mutationId);retryTable='commercial_client_history';retryInput=validateClient(body.client);}
  else if(action==='create_opportunity'){retryId=await stableId(owner,'crm-opportunity-create',body.mutationId);retryTable='commercial_history';retryInput=validateOpportunity(body.opportunity);}
  else{retryId=await stableId(owner,'crm-negotiation',body.mutationId);retryTable='commercial_history';retryParent=body.id;retryInput=validateNegotiation(body.negotiation);}
 }
 async function replay(){if(!retryId||!retryTable)return null;const event=await find(retryTable,retryId);if(!event)return null;const data=JSON.parse(event.data);if(JSON.stringify(action==='negotiation'?data:data.input)!==JSON.stringify(retryInput)||(retryParent&&event.opportunity_id!==retryParent))throw new CRMError('Esta solicitação já foi confirmada com outro conteúdo. Abra o registro para editar.',409);return {ok:true,id:action==='create_client'?event.client_id:event.opportunity_id,reused:true};}
 const already=await replay();if(already)return already;
 let plan:any;
 if(action==='create_client')plan=await planCreateClient(owner,body.client,body.mutationId,now);
 else if(action==='save_client'||action==='archive_client'){
  const row=await find('commercial_clients',body.id);
  if(action==='archive_client'&&body.archived===true){const active=await db.prepare('SELECT id FROM commercial_opportunities WHERE owner=? AND client_id=? AND archived=0 LIMIT 1').bind(owner,body.id).first();if(active)throw new CRMError('Arquive as oportunidades ativas desse cliente antes de arquivar o cadastro.');}
  plan=action==='save_client'?planSaveClient(owner,row,body.revision,body.client,now):planArchive(owner,'client',row,body.revision,body.archived,null,now);
 }else{
  const row=action==='create_opportunity'?null:await find('commercial_opportunities',body.id);
  if(action==='negotiation')plan=await planNegotiation(owner,row,body.revision,body.negotiation,body.mutationId,now);
  else{
   const client=await find('commercial_clients',action==='archive_opportunity'?row?.client_id:body.opportunity?.clientId);
   if(action==='create_opportunity')plan=await planCreateOpportunity(owner,body.opportunity,body.mutationId,client,now);
   else if(action==='archive_opportunity')plan=planArchive(owner,'opportunity',row,body.revision,body.archived,client,now);
   else{const contract=await db.prepare('SELECT * FROM commercial_contracts WHERE opportunity_id=? AND owner=?').bind(body.id,owner).first();plan=planSaveOpportunity(owner,row,body.revision,body.opportunity,client,contract,now);}
  }
 }
 if(!plan.statements.length)return {ok:true,id:plan.id,reused:true};
 await createProtectionSnapshot(owner,'Antes de '+({'create_client':'criar cliente','save_client':'editar cliente','archive_client':'arquivar/restaurar cliente','create_opportunity':'criar oportunidade','save_opportunity':'editar oportunidade','archive_opportunity':'arquivar/restaurar oportunidade','negotiation':'registrar negociação'} as Record<string,string>)[action]);
 try{const results=await db.batch(plan.statements.map((s:any)=>db.prepare(s.sql).bind(...s.args)));if(!results[0].meta.changes)throw new CRMError('O registro ou seus vínculos mudaram. Recarregue os dados antes de salvar.',409);}catch(e:any){const committed=await replay();if(committed)return committed;if(e instanceof CRMError)throw e;if(/unique|constraint/i.test(e.message||''))throw new CRMError('Esse cadastro ou vínculo já existe. Recarregue os dados para conferir.',409);throw new CRMError('Não foi possível salvar. A operação foi cancelada.',503);}
 return {ok:true,id:action==='negotiation'?body.id:plan.id};
}
