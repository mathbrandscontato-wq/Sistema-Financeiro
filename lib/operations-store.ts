import {env} from 'cloudflare:workers';
import {createProtectionSnapshot} from './protection';
import {CRMError} from './crm.mjs';
import {stableId} from './commercial-import.mjs';
import {initialOperations,mutateOperations,operationsSummary} from './operations.mjs';
export const operationsToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function readOperations(owner:string){if(!env.DB)throw new CRMError('Banco indisponível.',503);const [row,payments,history]=await Promise.all([env.DB.prepare('SELECT * FROM operational_state WHERE owner=?').bind(owner).first<any>(),env.DB.prepare('SELECT * FROM commercial_payments WHERE owner=?').bind(owner).all(),env.DB.prepare('SELECT * FROM operational_history WHERE owner=? ORDER BY created DESC LIMIT 100').bind(owner).all()]);const state=row?JSON.parse(row.data):initialOperations();return {state,revision:row?.revision||0,summary:operationsSummary(state,payments.results,operationsToday()),history:history.results};}
export async function saveOperations(owner:string,body:any){
 if(!env.DB||!env.BUCKET)throw new CRMError('A proteção dos dados está indisponível. Nenhuma alteração foi realizada.',503);
 if(typeof body.mutationId!=='string'||!/^[a-zA-Z0-9_-]{10,100}$/.test(body.mutationId)||!Number.isSafeInteger(body.revision)||body.revision<0)throw new CRMError('Solicitação inválida.');
 const db=env.DB,eid=await stableId(owner,'operations',body.mutationId),input=JSON.stringify(body),now=new Date().toISOString();
 const replay=async()=>{const r=await db.prepare('SELECT data FROM operational_history WHERE id=? AND owner=?').bind(eid,owner).first<any>();if(!r)return false;if(JSON.parse(r.data).request!==input)throw new CRMError('Solicitação já utilizada com outro conteúdo.',409);return true;};
 if(await replay())return {ok:true,reused:true};
 const row=await db.prepare('SELECT * FROM operational_state WHERE owner=?').bind(owner).first<any>();if((row?.revision||0)!==body.revision)throw new CRMError('O planejamento mudou. Recarregue antes de salvar.',409);
 const before=row?JSON.parse(row.data):initialOperations(),after=mutateOperations(before,body,operationsToday());
 await createProtectionSnapshot(owner,'Antes da operação de planejamento: '+body.action);
 try{const results=await db.batch([
 db.prepare('INSERT INTO operational_state(owner,data,revision,updated) VALUES(?,?,0,?) ON CONFLICT(owner) DO NOTHING').bind(owner,JSON.stringify(initialOperations()),now),
 db.prepare('UPDATE operational_state SET data=?,revision=revision+1,updated=? WHERE owner=? AND revision=?').bind(JSON.stringify(after),now,owner,body.revision),
 db.prepare('INSERT INTO operational_history(id,owner,action,data,created) SELECT ?,?,?,?,? WHERE changes()=1').bind(eid,owner,body.action,JSON.stringify({request:input,before,after}),now)]);
 if(!results[1].meta.changes){if(await replay())return {ok:true,reused:true};throw new CRMError('O planejamento mudou. Recarregue antes de salvar.',409);}
 }catch(e:any){if(await replay())return {ok:true,reused:true};if(e instanceof CRMError)throw e;throw new CRMError('Não foi possível salvar. Nenhuma operação parcial foi confirmada.',503);}
 return {ok:true};
}
