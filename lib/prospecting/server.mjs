import {RuntimeStore} from './runtime-store.mjs';
import {createCommercialRuntime} from './orchestrator.mjs';
import {createCommercialAgent} from './agent.mjs';
import {createMetaWhatsAppProvider,createResendProvider,createGooglePlacesProvider,parseWhatsAppWebhook} from './providers.mjs';
import {verifyWebhook} from './webhook.mjs';
import {createBudgetGuard} from './budget.mjs';
import {approvedPixMessage} from './closing.mjs';
import {createSchedulerHandler} from './scheduler.mjs';

export const PRIVATE_CRM_ORIGIN='https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site';
const now=()=>new Date().toISOString();
const tokenEqual=async(a,b)=>{
 if(typeof a!=='string'||!a||typeof b!=='string'||!b)return false;
 const hash=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 const x=await hash(a),y=await hash(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
};
export function serverReadiness(env,account){
 const has=k=>typeof env[k]==='string'&&env[k].length>0;
 return {configured:!!account,dryRun:account?.dryRun??true,killSwitch:account?.killSwitch??true,externalApproved:env.COMMERCIAL_EXTERNAL_APPROVED==='true',
  whatsapp:['META_APP_SECRET','META_VERIFY_TOKEN','META_PHONE_NUMBER_ID','META_WABA_ID','META_GRAPH_VERSION','META_ACCESS_TOKEN'].every(has),
  agent:['OPENAI_API_KEY','COMMERCIAL_AI_MODEL'].every(has),email:['RESEND_API_KEY','COMMERCIAL_EMAIL_FROM'].every(has)&&account?.config?.ownerEmailVerified===true,
  research:has('GOOGLE_PLACES_API_KEY'),scheduler:env.COMMERCIAL_SCHEDULER_ENABLED==='true',jobSecret:has('COMMERCIAL_JOB_SECRET'),
  simulations:env.COMMERCIAL_ALLOW_SIMULATIONS==='true',pix:env.COMMERCIAL_PIX_VALIDATED==='true'&&['COMMERCIAL_PIX_PAYLOAD','COMMERCIAL_PIX_KEY','COMMERCIAL_PIX_REFERENCE'].every(has)};
}
export async function commercialServices(env,owner,{clock=now,fetchImpl=globalThis.fetch,beforeWrite=async()=>{}}={}){
 if(!env.DB)throw new Error('database_unavailable');
 const store=new RuntimeStore(env.DB),account=await store.account(owner),budgets=account?.config?.budgets||{};
 const offer=await env.DB.prepare('SELECT price_cents,deposit_policy FROM site_offers WHERE owner=? ORDER BY opened DESC LIMIT 1').bind(owner).first();
 const offerAligned=offer?.price_cents===50000&&offer?.deposit_policy==='contract_deposit';
 const live=!!account&&!account.dryRun&&!account.killSwitch&&offerAligned&&account.config.liveApproved===true&&account.config.webhookVerified===true&&account.config.waQuality==='healthy'&&budgets.limitMicros>0&&env.COMMERCIAL_EXTERNAL_APPROVED==='true';
 const budgetGuard=createBudgetGuard({db:env.DB,owner,attemptPrefix:crypto.randomUUID(),limitMicros:budgets.limitMicros||0,clock});
 const reserveBudget=async input=>{
  // Reconfiguration invalidates an already-created provider before any paid request.
  const fresh=await store.account(owner);
  if(!live||!fresh||fresh.revision!==account.revision||fresh.dryRun||fresh.killSwitch)return false;
  const freshOffer=await env.DB.prepare('SELECT price_cents,deposit_policy FROM site_offers WHERE owner=? ORDER BY opened DESC LIMIT 1').bind(owner).first();
  if(freshOffer?.price_cents!==50000||freshOffer?.deposit_policy!=='contract_deposit')return false;
  return budgetGuard(input);
 };
 const base=provider=>({enabled:live,approved:live,approvalRef:env.COMMERCIAL_ACTIVATION_REFERENCE,estimatedCostMicros:budgets.estimates?.[provider]||0,environment:env.COMMERCIAL_ENVIRONMENT||'test',productionApproved:env.COMMERCIAL_PRODUCTION_APPROVED==='true',activationRef:env.COMMERCIAL_ACTIVATION_REFERENCE,testRecipients:account?.config?.testRecipients||[],timeoutMs:12000});
 const whatsapp=createMetaWhatsAppProvider({...base('meta_whatsapp'),graphVersion:env.META_GRAPH_VERSION,phoneNumberId:env.META_PHONE_NUMBER_ID,accessToken:env.META_ACCESS_TOKEN},{fetchImpl,reserveBudget});
 const email=createResendProvider({...base('resend'),apiKey:env.RESEND_API_KEY,from:env.COMMERCIAL_EMAIL_FROM,testRecipients:account?.config?.ownerEmailVerified?[account.config.ownerEmail]:[]},{fetchImpl,reserveBudget});
 const agent=createCommercialAgent({...base('openai_responses'),apiKey:env.OPENAI_API_KEY,model:env.COMMERCIAL_AI_MODEL},{fetchImpl,reserveBudget});
 const runtime=createCommercialRuntime({db:env.DB,owner,clock,agent,whatsapp,email,beforeWrite,liveNetworkApproved:live,beforeSend:async({row})=>{
  if(row.payload?.kind==='approved_pix'){const approved=await approvedPixMessage(env.DB,owner,row.recipient,env);return approved.approvalRef===row.payload.approvalRef&&approved.text===row.payload.text;}
  return true;
 }});
 return {store,account,runtime,readiness:{...serverReadiness(env,account),offerAligned,effectiveExternalEnabled:live},researchProvider:()=>createGooglePlacesProvider({...base('google_places'),apiKey:env.GOOGLE_PLACES_API_KEY},{fetchImpl,reserveBudget})};
}
export async function receiveWhatsApp(request,env,{clock=now}={}){
 const owner=env.COMMERCIAL_OWNER||env.INTAKE_OWNER;
 if(!env.DB||!owner||!env.META_APP_SECRET||!env.META_VERIFY_TOKEN||!env.META_PHONE_NUMBER_ID||!env.META_WABA_ID)return new Response('Webhook não configurado.',{status:503});
 const url=new URL(request.url);
 if(request.method==='GET'){
  if(url.searchParams.get('hub.mode')!=='subscribe'||!await tokenEqual(url.searchParams.get('hub.verify_token'),env.META_VERIFY_TOKEN))return new Response('Não autorizado.',{status:403});
  const challenge=url.searchParams.get('hub.challenge');return challenge&&/^\d{1,100}$/.test(challenge)?new Response(challenge,{headers:{'Cache-Control':'no-store'}}):new Response('Inválido.',{status:400});
 }
 if(request.method!=='POST')return new Response('Método inválido.',{status:405});
 if(Number(request.headers.get('content-length')||0)>131072)return new Response('Corpo excedido.',{status:413});
 const chunks=[];let size=0;const reader=request.body?.getReader();
 if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>131072){await reader.cancel();return new Response('Corpo excedido.',{status:413});}chunks.push(part.value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 if(!await verifyWebhook(bytes,request.headers.get('x-hub-signature-256'),env.META_APP_SECRET))return new Response('Não autorizado.',{status:401});
 try{
  const service=await commercialServices(env,owner,{clock});
  if(!service.account||service.account.account!==env.META_PHONE_NUMBER_ID)return new Response('Conta não homologada.',{status:503});
  const events=parseWhatsAppWebhook(JSON.parse(new TextDecoder().decode(bytes)),{phoneNumberId:env.META_PHONE_NUMBER_ID,wabaId:env.META_WABA_ID});
  await service.runtime.receiveNormalizedEvents(events);
  return Response.json({ok:true,received:events.length},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Não foi possível registrar o evento.'},{status:503});}
}
/** @param {Request} request @param {any} env @param {any} options */
export async function runCommercialJob(request,env,options={}){
 const {markets,clock=now,beforeWrite=async()=>{},mockProvider}=options;
 const owner=env.COMMERCIAL_OWNER||env.INTAKE_OWNER;
 if(request.method!=='POST'||!owner||!env.COMMERCIAL_JOB_SECRET||!await tokenEqual(request.headers.get('authorization'),'Bearer '+env.COMMERCIAL_JOB_SECRET))return Response.json({error:'Acesso não autorizado.'},{status:401});
 const body=await request.text();if(body.length>2000)return Response.json({error:'Corpo excedido.'},{status:413});
 let input;try{input=body?JSON.parse(body):{};}catch{return Response.json({error:'Solicitação inválida.'},{status:400});}
 if(Object.keys(input).some(k=>!['scheduledAt'].includes(k)))return Response.json({error:'Solicitação inválida.'},{status:400});
 const service=await commercialServices(env,owner,{clock,beforeWrite});
 if(!service.account||service.account.killSwitch)return Response.json({status:'disabled'});
  const scheduler=createSchedulerHandler({markets,clock,loadConfig:async()=>({...service.account.config.research,owner,researchEnabled:env.COMMERCIAL_SCHEDULER_ENABLED==='true'&&service.account.config.research?.researchEnabled===true,allowLiveResearch:!service.account.dryRun&&env.COMMERCIAL_EXTERNAL_APPROVED==='true'}),providerFactory:()=>service.account.dryRun?(mockProvider||{id:'empty-homologation',mode:'mock',search:async()=>[]}):service.researchProvider(),loadExistingWork:async()=>{
  const rows=(await env.DB.prepare("SELECT id,stage,next_action_on FROM commercial_opportunities WHERE owner=? AND archived=0 AND stage NOT IN ('Fechado','Recusado') LIMIT 1000").bind(owner).all()).results;
  return rows.filter(r=>r.next_action_on||['Qualificação','Negociação'].includes(r.stage)).map(r=>({id:r.id,kind:r.next_action_on?'agreed_return':'interested',dueAt:r.next_action_on?r.next_action_on+'T12:00:00-03:00':undefined}));
 }});
 const research=await scheduler(input.scheduledAt?{scheduledTime:Date.parse(input.scheduledAt)}:{},env),inbox=await service.runtime.processInbox({limit:10}),outbox=await service.runtime.flushOutbox({limit:10});
 return Response.json({research,inbox,outbox},{headers:{'Cache-Control':'no-store'}});
}
export async function processCommercialQueues(env,{beforeWrite=async()=>{}}={}){
 const owner=env.COMMERCIAL_OWNER||env.INTAKE_OWNER;if(!owner||!env.DB)return {status:'disabled'};
 const service=await commercialServices(env,owner,{beforeWrite});if(!service.account||service.account.killSwitch)return {status:'disabled'};
 return {inbox:await service.runtime.processInbox({limit:10}),outbox:await service.runtime.flushOutbox({limit:10})};
}
