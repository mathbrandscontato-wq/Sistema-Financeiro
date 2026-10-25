import {RuntimeStore} from './runtime-store.mjs';
import {createCommercialRuntime} from './orchestrator.mjs';
import {createCloudflareCommercialAgent} from './cloudflare-ai.mjs';
import {createTavilySearchProvider} from './tavily-search.mjs';
import {createMetaWhatsAppProvider,createResendProvider,parseWhatsAppWebhook} from './providers.mjs';
import {verifyWebhook} from './webhook.mjs';
import {createFreeUsageGuard,freePlanCurrent,freeServiceWindow} from './free-cost.mjs';
import {approvedPixMessage} from './closing.mjs';
import {createSchedulerHandler} from './scheduler.mjs';
import {ownerNotificationReadiness,validateOwnerNotification} from './owner-notifications.mjs';

export const PRIVATE_CRM_ORIGIN='https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site';
const now=()=>new Date().toISOString();
const freePlanFlags={meta_whatsapp:'META_FREE_SERVICE_VERIFIED',resend:'RESEND_FREE_PLAN_VERIFIED',cloudflare_ai:'CLOUDFLARE_AI_FREE_PLAN_VERIFIED',tavily_search:'TAVILY_FREE_PLAN_VERIFIED'};
const planSettings=(env,provider,clock)=>({costMode:'free_only',estimatedCostMicros:0,freePlanVerified:env[freePlanFlags[provider]]==='true',freePlanReviewThrough:env.COMMERCIAL_FREE_PLAN_REVIEW_THROUGH,approvalRef:env.COMMERCIAL_ACTIVATION_REFERENCE,clock});
const zeroCostConfig=config=>config?.costPolicy==='free_only'&&config.budgets?.limitMicros===0&&config.budgets?.estimates&&typeof config.budgets.estimates==='object'&&!Array.isArray(config.budgets.estimates)&&Object.keys(config.budgets.estimates).length===0;
const tokenEqual=async(a,b)=>{
 if(typeof a!=='string'||!a||typeof b!=='string'||!b)return false;
 const hash=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 const x=await hash(a),y=await hash(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
};
export function serverReadiness(env,account,at=now()){
 const has=k=>typeof env[k]==='string'&&env[k].length>0;
 const verified=provider=>freePlanCurrent(planSettings(env,provider,()=>at),at);
 return {configured:!!account,dryRun:account?.dryRun??true,killSwitch:account?.killSwitch??true,externalApproved:env.COMMERCIAL_EXTERNAL_APPROVED==='true',
  zeroCostPolicy:zeroCostConfig(account?.config),
  whatsapp:['META_APP_SECRET','META_VERIFY_TOKEN','META_PHONE_NUMBER_ID','META_WABA_ID','META_GRAPH_VERSION','META_ACCESS_TOKEN'].every(has)&&verified('meta_whatsapp'),
  agent:['CLOUDFLARE_AI_ACCOUNT_ID','CLOUDFLARE_AI_API_TOKEN'].every(has)&&verified('cloudflare_ai'),email:['RESEND_API_KEY','COMMERCIAL_EMAIL_FROM'].every(has)&&account?.config?.ownerEmailVerified===true&&verified('resend'),
  research:has('TAVILY_API_KEY')&&verified('tavily_search')&&env.TAVILY_COMMERCIAL_USE_APPROVED==='true'&&has('TAVILY_COMMERCIAL_USE_APPROVAL_REFERENCE'),scheduler:env.COMMERCIAL_SCHEDULER_ENABLED==='true',jobSecret:has('COMMERCIAL_JOB_SECRET'),ownerNotifications:ownerNotificationReadiness(account?.config,at).status==='ready',
  simulations:env.COMMERCIAL_ALLOW_SIMULATIONS==='true',pix:env.COMMERCIAL_PIX_VALIDATED==='true'&&['COMMERCIAL_PIX_PAYLOAD','COMMERCIAL_PIX_KEY','COMMERCIAL_PIX_REFERENCE'].every(has)};
}
export async function commercialServices(env,owner,{clock=now,fetchImpl=globalThis.fetch,beforeWrite=async()=>{}}={}){
 if(!env.DB)throw new Error('database_unavailable');
 const store=new RuntimeStore(env.DB),account=await store.account(owner);
 const offer=await env.DB.prepare('SELECT price_cents,deposit_policy FROM site_offers WHERE owner=? ORDER BY opened DESC LIMIT 1').bind(owner).first();
 const offerAligned=offer?.price_cents===50000&&offer?.deposit_policy==='contract_deposit';
 const live=!!account&&!account.dryRun&&!account.killSwitch&&offerAligned&&zeroCostConfig(account.config)&&account.config.liveApproved===true&&account.config.webhookVerified===true&&account.config.waQuality==='healthy'&&env.COMMERCIAL_EXTERNAL_APPROVED==='true';
 // The deployed runtime has no paid provider path, even when old credentials remain.
 const quotaGuard=createFreeUsageGuard({db:env.DB,owner,attemptPrefix:crypto.randomUUID(),clock,planForProvider:provider=>planSettings(env,provider,clock)});
 const reserveBudget=async input=>{
  // Reconfiguration invalidates an already-created provider before any request.
  const fresh=await store.account(owner);
  if(!live||!fresh||fresh.revision!==account.revision||fresh.dryRun||fresh.killSwitch||!zeroCostConfig(fresh.config))return false;
  const freshOffer=await env.DB.prepare('SELECT price_cents,deposit_policy FROM site_offers WHERE owner=? ORDER BY opened DESC LIMIT 1').bind(owner).first();
  if(freshOffer?.price_cents!==50000||freshOffer?.deposit_policy!=='contract_deposit')return false;
  return quotaGuard(input);
 };
 const base=provider=>({...planSettings(env,provider,clock),enabled:live,approved:live,environment:env.COMMERCIAL_ENVIRONMENT||'test',productionApproved:env.COMMERCIAL_PRODUCTION_APPROVED==='true',activationRef:env.COMMERCIAL_ACTIVATION_REFERENCE,testRecipients:account?.config?.testRecipients||[],timeoutMs:12000});
 const whatsapp=createMetaWhatsAppProvider({...base('meta_whatsapp'),graphVersion:env.META_GRAPH_VERSION,phoneNumberId:env.META_PHONE_NUMBER_ID,accessToken:env.META_ACCESS_TOKEN},{fetchImpl,reserveBudget,lastRealInbound:async recipient=>(await store.conversation(owner,recipient))?.lastInbound});
 const email=createResendProvider({...base('resend'),apiKey:env.RESEND_API_KEY,from:env.COMMERCIAL_EMAIL_FROM,testRecipients:account?.config?.ownerEmailVerified?[account.config.ownerEmail]:[]},{fetchImpl,reserveBudget});
 const agent=createCloudflareCommercialAgent({...base('cloudflare_ai'),accountId:env.CLOUDFLARE_AI_ACCOUNT_ID,apiToken:env.CLOUDFLARE_AI_API_TOKEN},{fetchImpl,reserveBudget,clock});
 const runtime=createCommercialRuntime({db:env.DB,owner,clock,agent,whatsapp,email,beforeWrite,liveNetworkApproved:live,beforeSend:async({row,account:current})=>{
  if(!current.dryRun&&row.channel==='whatsapp'&&(row.payload?.template||!freeServiceWindow((await store.conversation(owner,row.recipient))?.lastInbound,clock())))return false;
  if(row.payload?.kind==='owner_deal_notice')return (await validateOwnerNotification({db:env.DB,store,owner,row,clock})).allowed;
  if(row.payload?.kind==='approved_pix'){const approved=await approvedPixMessage(env.DB,owner,row.recipient,env);return approved.approvalRef===row.payload.approvalRef&&approved.text===row.payload.text;}
  return true;
 }});
 const onUnexpectedUsage=async()=>{
  // Pause first: a backup failure must never allow additional provider requests.
  await env.DB.prepare('UPDATE prospecting_accounts SET kill_switch=1,revision=revision+1,updated=? WHERE owner=?').bind(new Date(clock()).toISOString(),owner).run();
 };
 return {store,account,runtime,readiness:{...serverReadiness(env,account,clock()),offerAligned,effectiveExternalEnabled:live},researchProvider:()=>createTavilySearchProvider({...base('tavily_search'),apiKey:env.TAVILY_API_KEY,useCaseApproved:env.TAVILY_COMMERCIAL_USE_APPROVED==='true',useCaseApprovalRef:env.TAVILY_COMMERCIAL_USE_APPROVAL_REFERENCE,metadataPersistenceApproved:env.TAVILY_METADATA_PERSISTENCE_APPROVED==='true',metadataPersistenceApprovalRef:env.TAVILY_METADATA_PERSISTENCE_APPROVAL_REFERENCE},{fetchImpl,reserveBudget,clock,onUnexpectedUsage})};
}
/** @param {Request} request @param {any} env @param {{clock?:()=>string,onAccepted?:()=>void}} options */
export async function receiveWhatsApp(request,env,{clock=now,onAccepted}={}){
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
  // A replay may drain durable pending work after an interrupted scheduling attempt.
  // Queue processing is idempotent and runs after the HTTP acknowledgement.
  if(events.length&&typeof onAccepted==='function')onAccepted();
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
  const scheduler=createSchedulerHandler({markets,clock,loadConfig:async()=>({...service.account.config.research,owner,costPolicy:'free_only',maxQueries:Math.min(20,service.account.config.research?.maxQueries||6),costPerQueryMicros:0,maxCostMicros:0,researchEnabled:env.COMMERCIAL_SCHEDULER_ENABLED==='true'&&service.account.config.research?.researchEnabled===true,allowLiveResearch:service.readiness.effectiveExternalEnabled&&service.readiness.research}),providerFactory:()=>service.account.dryRun?(mockProvider||{id:'empty-homologation',mode:'mock',search:async()=>[]}):service.researchProvider(),loadExistingWork:async()=>{
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
