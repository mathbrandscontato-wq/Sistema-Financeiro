import {normalizeRecipient} from './policy.mjs';

export class ProviderError extends Error{
 constructor(code,{status=0,retryable=false,uncertain=false}={}){super(code);this.name='ProviderError';this.code=code;this.status=status;this.retryable=retryable;this.uncertain=uncertain;}
}
const text=(v,max=4000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new ProviderError('invalid_provider_input');return v;};
const email=v=>typeof v==='string'&&/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(v);
function timeoutSignal(external,milliseconds){
 const controller=new AbortController(),abort=()=>controller.abort();
 if(external?.aborted)controller.abort();else external?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,milliseconds);
 return {signal:controller.signal,clear(){clearTimeout(timer);external?.removeEventListener('abort',abort);}};
}
// Callers provide an atomic, persistent cost reservation. No credentials or bodies enter errors.
export async function authorizeProviderCall(config,reserveBudget,provider){
 if(config.enabled!==true||config.approved!==true||!config.approvalRef)throw new ProviderError('provider_disabled');
 if(!Number.isSafeInteger(config.estimatedCostMicros)||config.estimatedCostMicros<=0||typeof reserveBudget!=='function')throw new ProviderError('provider_budget_unconfigured');
 let granted;try{granted=await reserveBudget({provider,costMicros:config.estimatedCostMicros});}catch{throw new ProviderError('provider_budget_unavailable');}
 if(granted!==true)throw new ProviderError('provider_budget_exhausted');
}
export async function providerJSON(fetchImpl,url,{method='POST',headers,body,signal,timeoutMs=12000,sideEffect=false}={}){
 const timeout=timeoutSignal(signal,Math.max(100,Math.min(30000,timeoutMs)));
 try{
  const response=await fetchImpl(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:timeout.signal,redirect:'error'});
  if(!response.ok)throw new ProviderError('provider_http_error',{status:response.status,retryable:response.status===429,uncertain:sideEffect&&response.status>=500});
  const raw=await response.text();if(raw.length>1048576)throw new ProviderError('provider_response_too_large',{uncertain:sideEffect});
  try{return JSON.parse(raw);}catch{throw new ProviderError('provider_invalid_response',{uncertain:sideEffect});}
 }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('provider_transport_error',{uncertain:sideEffect});}
 finally{timeout.clear();}
}
function outboundRecipient(config,recipient,channel){
 const normalized=channel==='whatsapp'?normalizeRecipient(recipient):recipient;
 if(channel==='email'&&!email(normalized))throw new ProviderError('invalid_email');
 if(config.environment==='test'){
  const list=config.testRecipients||[];
  const allowed=channel==='whatsapp'?list.map(normalizeRecipient):list;
  if(!allowed.includes(normalized))throw new ProviderError('recipient_not_allowlisted');
 }else if(config.environment!=='production'||config.productionApproved!==true||!config.activationRef)throw new ProviderError('production_transport_not_approved');
 return normalized;
}
export function createMetaWhatsAppProvider(config={},deps={}){
 const fetchImpl=deps.fetchImpl||globalThis.fetch;
 async function send({recipient,text:body,template,policyDecision,signal}={}){
  if(policyDecision!=='allowed')throw new ProviderError('messaging_policy_required');
  const to=outboundRecipient(config,recipient,'whatsapp');
  if(!/^v\d+\.\d+$/.test(config.graphVersion||'')||!/^\d{3,30}$/.test(config.phoneNumberId||'')||!config.accessToken)throw new ProviderError('meta_credentials_unconfigured');
  let message;
  if(template){
   if(template.approved!==true||!/^[a-z0-9_]{1,512}$/.test(template.name||'')||!/^\w{2,3}(?:_\w{2,4})?$/.test(template.language||''))throw new ProviderError('template_not_approved');
   if(template.parameters!==undefined&&(!Array.isArray(template.parameters)||template.parameters.length>10||template.parameters.some(x=>typeof x!=='string'||x.length>1000)))throw new ProviderError('invalid_template_parameters');
   message={type:'template',template:{name:template.name,language:{code:template.language},...(template.parameters?.length?{components:[{type:'body',parameters:template.parameters.map(value=>({type:'text',text:value}))}]}:{})}};
  }else message={type:'text',text:{preview_url:false,body:text(body)}};
  await authorizeProviderCall(config,deps.reserveBudget,'meta_whatsapp');
  const result=await providerJSON(fetchImpl,`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,{headers:{Authorization:'Bearer '+config.accessToken,'Content-Type':'application/json'},body:{messaging_product:'whatsapp',recipient_type:'individual',to,...message},signal,timeoutMs:config.timeoutMs,sideEffect:true});
  const id=result.messages?.[0]?.id;if(typeof id!=='string'||!id)throw new ProviderError('meta_message_id_missing',{uncertain:true});
  return {status:'accepted',providerId:id};
 }
 return {id:'meta_whatsapp',mode:'official',send,sendText:args=>send({...args,template:undefined}),sendTemplate:args=>send(args)};
}
function eventTime(value){const n=Number(value);return Number.isFinite(n)&&n>0?new Date(n*1000).toISOString():null;}
// Authenticate the raw webhook before calling this parser. Never treats client media as payment.
export function parseWhatsAppWebhook(payload,{phoneNumberId,wabaId,maxEvents=100}={}){
 if(payload?.object!=='whatsapp_business_account'||!phoneNumberId||!Array.isArray(payload.entry))throw new ProviderError('invalid_meta_webhook');
 const events=[];
 const push=e=>{if(events.length>=maxEvents)throw new ProviderError('meta_event_limit');events.push(e);};
 for(const entry of payload.entry){
  if(wabaId&&entry.id!==wabaId)continue;
  for(const change of entry.changes||[]){
   const value=change.value||{};if(value.metadata?.phone_number_id!==phoneNumberId)continue;
   for(const m of value.messages||[]){
    if(change.field!=='messages'||typeof m.id!=='string'||!m.from)continue;
    let recipient;try{recipient=normalizeRecipient(m.from);}catch{continue;}
    const at=eventTime(m.timestamp);if(!at)continue;
    push({kind:'inbound',eventId:'inbound:'+m.id,accountId:phoneNumberId,recipient,at,providerId:m.id,messageType:m.type,text:m.type==='text'&&typeof m.text?.body==='string'?m.text.body.slice(0,4000):null});
   }
   for(const s of value.statuses||[]){
    if(typeof s.id!=='string'||!['sent','delivered','read','failed'].includes(s.status))continue;
    const at=eventTime(s.timestamp);if(!at)continue;
    push({kind:'status',eventId:`status:${s.id}:${s.status}:${s.timestamp}`,accountId:phoneNumberId,providerId:s.id,status:s.status,at,errorCodes:(s.errors||[]).map(e=>e.code).filter(Number.isSafeInteger).slice(0,5)});
   }
   // Coexistence shape needs real-account homologation; unknown echoes are ignored safely.
   if(change.field==='smb_message_echoes')for(const m of value.message_echoes||[]){
    if(typeof m.id!=='string'||!m.to)continue;let recipient;try{recipient=normalizeRecipient(m.to);}catch{continue;}
    const at=eventTime(m.timestamp);if(at)push({kind:'human_echo',eventId:'human:'+m.id,accountId:phoneNumberId,recipient,providerId:m.id,at});
   }
  }
 }
 return events;
}
export function createGooglePlacesProvider(config={},deps={}){
 return {id:'google_places',mode:'authorized',async search(query,{signal,now=new Date().toISOString(),market}={}){
  text(query,500);if(/\bsite:/i.test(query))throw new ProviderError('provider_unsupported_query');if(!config.apiKey)throw new ProviderError('google_credentials_unconfigured');
  await authorizeProviderCall(config,deps.reserveBudget,'google_places');
  const result=await providerJSON(deps.fetchImpl||globalThis.fetch,'https://places.googleapis.com/v1/places:searchText',{headers:{'Content-Type':'application/json','X-Goog-Api-Key':config.apiKey,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.googleMapsUri'},body:{textQuery:query,languageCode:'pt-BR',regionCode:'BR',pageSize:Math.max(1,Math.min(20,config.pageSize||10))},signal,timeoutMs:config.timeoutMs});
  if(result.places!==undefined&&!Array.isArray(result.places))throw new ProviderError('google_invalid_places');
  return (result.places||[]).slice(0,20).filter(p=>typeof p.id==='string'&&/^[A-Za-z0-9_-]{3,90}$/.test(p.id)&&typeof p.displayName?.text==='string').map(p=>({
   publicId:'google_'+p.id,name:p.displayName.text.slice(0,200),market,city:null,requestedCity:'Joinville/SC',locationVerified:false,profileUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName.text)}&query_place_id=${encodeURIComponent(p.id)}`,
   criteria:{digitalPresence:0,activity:0,standardFit:0,decisionMaker:0,timing:0},evidence:[{url:`https://www.google.com/maps/search/?api=1&query=place&query_place_id=${encodeURIComponent(p.id)}`,fact:'Cadastro retornado por busca autorizada; identidade e atividade aguardam verificação independente.',verifiedAt:now,reviewed:false}],
   provider:'google_places',providerPlaceId:p.id,activityVerified:false,consent:null,mock:false,persistenceAllowed:false,retentionPolicy:'provider_terms_review_required'
  }));
 }};
}
export function createResendProvider(config={},deps={}){
 return {id:'resend',mode:'official',async send({to,subject,text:body,idempotencyKey,signal}={}){
  const recipient=outboundRecipient(config,to,'email');if(!email(config.from)||!config.apiKey)throw new ProviderError('email_credentials_unconfigured');
  if(!/^[a-zA-Z0-9_:/.-]{10,128}$/.test(idempotencyKey||''))throw new ProviderError('invalid_email_idempotency');
  text(subject,200);if(/[\r\n]/.test(subject))throw new ProviderError('invalid_email_subject');text(body,8000);
  await authorizeProviderCall(config,deps.reserveBudget,'resend');
  const result=await providerJSON(deps.fetchImpl||globalThis.fetch,'https://api.resend.com/emails',{headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:{from:config.from,to:[recipient],subject,text:body},signal,timeoutMs:config.timeoutMs,sideEffect:true});
  if(typeof result.id!=='string'||!result.id)throw new ProviderError('email_id_missing',{uncertain:true});return {status:'accepted',providerId:result.id};
 }};
}
