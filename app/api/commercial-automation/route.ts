import {env} from 'cloudflare:workers';
import {workspaceAccess} from '../../../lib/access';
import {createProtectionSnapshot} from '../../../lib/protection';
import {commercialServices,PRIVATE_CRM_ORIGIN} from '../../../lib/prospecting/server.mjs';
import {approveClosing,approvedPixMessage} from '../../../lib/prospecting/closing.mjs';
import {normalizeRecipient} from '../../../lib/prospecting/policy.mjs';
export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await workspaceAccess('team.manage');if(!user)return reply({error:'Acesso restrito ao proprietário.'},403);
 try{
  const service=await commercialServices(env,user.userId),db=env.DB!;
  const [summary,conversations,inbox,outbox,runs,prospects,costs,handoffs]=await Promise.all([
   service.store.summary(user.userId),db.prepare('SELECT recipient,opportunity_id,paused,opted_out,last_inbound,updated FROM prospecting_conversations WHERE owner=? ORDER BY updated DESC LIMIT 50').bind(user.userId).all(),
   db.prepare("SELECT event_id,recipient,kind,state,created FROM prospecting_inbox WHERE owner=? ORDER BY created DESC LIMIT 50").bind(user.userId).all(),
   db.prepare('SELECT key,channel,state,error_code,created,provider_id FROM prospecting_outbox WHERE owner=? ORDER BY created DESC LIMIT 50').bind(user.userId).all(),
   db.prepare('SELECT local_day,status,attempt,report FROM prospecting_runs WHERE owner=? ORDER BY local_day DESC LIMIT 15').bind(user.userId).all(),
   db.prepare('SELECT identity,market,score,grade,data,updated FROM prospecting_companies WHERE owner=? ORDER BY score DESC,updated DESC LIMIT 50').bind(user.userId).all(),
   db.prepare('SELECT day,provider,SUM(cost_micros) AS reserved_micros FROM prospecting_costs WHERE owner=? GROUP BY day,provider ORDER BY day DESC LIMIT 30').bind(user.userId).all(),
   db.prepare("SELECT opportunity_id,event_id,status,created FROM prospecting_handoffs WHERE owner=? ORDER BY created DESC LIMIT 30").bind(user.userId).all()
  ]);
  return reply({summary,readiness:service.readiness,conversations:conversations.results,inbox:inbox.results,outbox:outbox.results,runs:runs.results,prospects:prospects.results.map((r:any)=>({...r,data:JSON.parse(r.data)})),costs:costs.results,handoffs:handoffs.results,crmOrigin:PRIVATE_CRM_ORIGIN});
 }catch{return reply({error:'Homologação indisponível. Confira as migrações e a configuração do ambiente.'},503);}
}
export async function POST(req:Request){
 const user=await workspaceAccess('team.manage');if(!user||user.role!=='owner')return reply({error:'Acesso restrito ao proprietário.'},403);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Origem inválida.'},403);
 const raw=await req.text();if(raw.length>18000)return reply({error:'Solicitação excedida.'},413);
 try{
  const b=JSON.parse(raw),now=new Date().toISOString(),service=await commercialServices(env,user.userId,{beforeWrite:async()=>{await createProtectionSnapshot(user.userId,'Antes de atualizar atendimento comercial');}}),store=service.store;
  if(b.action==='configure'){
   if(b.dryRun===false&&(env.COMMERCIAL_EXTERNAL_APPROVED!=='true'||!env.COMMERCIAL_ACTIVATION_REFERENCE||b.account!==env.META_PHONE_NUMBER_ID))return reply({error:'Ativação externa ainda não homologada.'},409);
   await createProtectionSnapshot(user.userId,'Antes de configurar automação comercial');
   const config={...b.config,crmOrigin:PRIVATE_CRM_ORIGIN};
   return reply(await store.configureAccount(user.userId,{account:b.account,dryRun:b.dryRun!==false,killSwitch:b.killSwitch!==false,revision:b.revision,config},now));
  }
  if(!service.account)return reply({error:'Configure primeiro a homologação.'},409);
  if(['consent','takeover','resume','opt_out','revoke_closing','queue_pix'].includes(b.action)){
   const recipient=normalizeRecipient(b.phone);
   await createProtectionSnapshot(user.userId,'Antes de atualizar consentimento ou atendimento comercial');
   const details:any={phase:'attempt',recipient};
   if(b.action==='consent')details.consent={channel:b.consent?.channel,brand:b.consent?.brand,purpose:b.consent?.purpose,evidence:b.consent?.evidence,grantedAt:b.consent?.grantedAt,expiresAt:b.consent?.expiresAt};
   await env.DB!.prepare('INSERT INTO workspace_access_history(id,owner,actor,action,data,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,user.actorId,'commercial_automation:'+b.action,JSON.stringify(details),now).run();
  }
  if(b.action==='consent')return reply(await store.setConsent(user.userId,b.phone,b.consent,now));
  if(b.action==='takeover')return reply(await store.takeover(user.userId,b.phone,user.userId,now));
  if(b.action==='resume')return reply(await store.resume(user.userId,b.phone,user.userId,now));
  if(b.action==='opt_out')return reply(await store.optOut(user.userId,b.phone,now));
  if(b.action==='simulate'){
   if(!service.account.dryRun||env.COMMERCIAL_ALLOW_SIMULATIONS!=='true')return reply({error:'Simulações exigem ambiente de homologação autorizado.'},409);
   if(typeof b.message!=='string'||!b.message.trim()||b.message.length>4000)return reply({error:'Mensagem inválida.'},400);
   return reply(await service.runtime.receiveNormalizedEvents([{kind:'inbound',accountId:service.account.account,eventId:'simulation:'+crypto.randomUUID(),recipient:b.phone,at:now,text:b.message,simulated:true}]));
  }
  if(b.action==='process')return reply({inbox:await service.runtime.processInbox({limit:10}),outbox:await service.runtime.flushOutbox({limit:10})});
  if(b.action==='approve_closing'){await createProtectionSnapshot(user.userId,'Antes de registrar aprovação humana para o sinal');return reply(await approveClosing(env.DB,user.userId,user.userId,b.phone,b.approval,now));}
  if(b.action==='revoke_closing'){await env.DB!.prepare('UPDATE prospecting_approvals SET revoked=1,updated=? WHERE owner=? AND recipient=?').bind(now,user.userId,normalizeRecipient(b.phone)).run();return reply({ok:true});}
  if(b.action==='queue_pix'){
   const payload=await approvedPixMessage(env.DB,user.userId,b.phone,env);
   return reply(await store.enqueueOutbox(user.userId,{key:'pix:'+payload.approvalRef,recipient:b.phone,channel:'whatsapp',payload,sourceMode:service.account.dryRun?'simulation':'real',simulated:service.account.dryRun},now));
  }
  return reply({error:'Ação inválida.'},400);
 }catch(e:any){const allowed=/^[a-z_]{3,80}$/.test(e.message||'');return reply({error:allowed?'Operação bloqueada: '+e.message:'A operação não foi confirmada.'},409);}
}
