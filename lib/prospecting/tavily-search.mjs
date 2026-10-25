import {ProviderError,authorizeProviderCall,providerJSON} from './providers.mjs';

const ENDPOINT='https://api.tavily.com/search';
const RETENTION='Minimal metadata URL + title only; verification required';
const controls=/[\u0000-\u001f\u007f]/;
const fail=code=>{throw new ProviderError(code);};
const reference=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200&&!controls.test(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function publicDomain(value){
 if(typeof value!=='string'||value.length>253||value!==value.toLowerCase())return false;
 const labels=value.split('.');
 if(labels.length<2||labels.some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return false;
 if(!/^[a-z]{2,63}$/.test(labels.at(-1))||/\.(?:localhost|local|internal|invalid|test|example|onion)$/.test(value))return false;
 // Reject IP spellings, including integer/hex/octal forms normalized by URL.
 try{return new URL('https://'+value).hostname===value&&!/^\d+(?:\.\d+){0,3}$/.test(value);}catch{return false;}
}
function safePath(path){
 if(typeof path!=='string'||!path.startsWith('/')||path.includes('\\')||controls.test(path))return null;
 const parts=[];
 try{for(const part of path.split('/')){const decoded=decodeURIComponent(part);if(decoded==='.'||decoded==='..'||/[\\/%?#]/.test(decoded)||controls.test(decoded))return null;parts.push(decoded);}}catch{return null;}
 return parts.join('/');
}

// The library string remains intact; the provider translation is explicit provenance.
export function normalizeTavilyQuery(originalQuery){
 if(typeof originalQuery!=='string'||!originalQuery.trim()||originalQuery.length>400||controls.test(originalQuery))fail('invalid_tavily_query');
 if((originalQuery.match(/"/g)||[]).length%2)fail('unsupported_tavily_query');
 const outside=originalQuery.replace(/"[^"\r\n]*"/g,match=>' '.repeat(match.length));
 const sites=[...outside.matchAll(/(?:^|\s)(site:([^\s]+))(?=\s|$)/g)];
 if(sites.length>1)fail('unsupported_tavily_query');
 const match=sites[0],operator=match?.[1]??null,target=match?.[2]??null,operatorStart=match?match.index+match[0].length-operator.length:0;
 const slash=target?.indexOf('/')??-1,domain=target?(slash<0?target:target.slice(0,slash)).toLowerCase():null,pathPrefix=slash<0?null:target.slice(slash);
 if(target&&(!publicDomain(domain)||(pathPrefix!==null&&(!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*\/?$/.test(pathPrefix)||safePath(pathPrefix)!==pathPrefix))))fail('unsupported_tavily_query');
 const remaining=match?outside.slice(0,operatorStart)+outside.slice(operatorStart+operator.length):outside;
 // Only one positive site filter and ordinary words/quoted phrases are supported.
 // Compound/negative/URL operators must be reviewed instead of broadened silently.
 if(/[:*|(){}<>@\\]/.test(remaining)||/(?:^|\s)(?:OR|AND|NOT)(?=\s|$)/i.test(remaining)||/(?:^|\s)[+-]\S/.test(remaining))fail('unsupported_tavily_query');
 const providerQuery=(match?originalQuery.slice(0,operatorStart)+originalQuery.slice(operatorStart+operator.length):originalQuery).trim();
 if(!providerQuery||!/[\p{L}\p{N}]/u.test(providerQuery))fail('unsupported_tavily_query');
 return {originalQuery,providerQuery,filterTranslation:{originalOperator:operator,parameter:match?'include_domains':null,value:match?domain+(pathPrefix||''):null,domain,pathPrefix,mode:match?'restrict':'none',exactMatch:true,verified:false}};
}

function sourceURL(value,filter){
 if(typeof value!=='string'||value.length>2048||controls.test(value)||value.includes('\\'))return null;
 // Inspect the original path before URL removes dot segments.
 const raw=value.match(/^https:\/\/([^/?#]+)([^?#]*)/i);if(!raw||raw[1].includes('%')||safePath(raw[2]||'/')===null)return null;
 let url;try{url=new URL(value);}catch{return null;}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||!publicDomain(host)||(filter.domain&&host!==filter.domain&&!host.endsWith('.'+filter.domain)))return null;
 const decoded=safePath(url.pathname);if(decoded===null)return null;
 if(filter.pathPrefix){const prefix=filter.pathPrefix.replace(/\/$/,'');if(decoded!==prefix&&!decoded.startsWith(prefix+'/'))return null;}
 // URL queries/fragments can contain tracking or personal data and are never retained.
 url.search='';url.hash='';if(url.pathname!=='/')url.pathname=url.pathname.replace(/\/$/,'');return url.href;
}
async function publicIdentity(url){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));
 return 'tavily_'+Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function createTavilySearchProvider(config={},deps={}){
 const clock=deps.clock||config.clock||(()=>new Date().toISOString());
 const fetchImpl=deps.fetchImpl||globalThis.fetch;
 let paused=false;
 return {
  id:'tavily_search',mode:'authorized',costMode:'free_only',creditsPerQuery:1,
  async search(query,{signal,now,market}={}){
   const normalized=normalizeTavilyQuery(query);
   if(paused)fail('tavily_usage_review_required');
   if(config.enabled!==true||config.approved!==true||!reference(config.approvalRef))fail('provider_disabled');
   // Distinct from free-plan and retention approval: confirm the acquisition use
   // case under the provider's current AUP before even reserving a free credit.
   if(config.useCaseApproved!==true||!reference(config.useCaseApprovalRef))fail('tavily_use_case_review_required');
   if(config.costMode!=='free_only'||config.estimatedCostMicros!==0||config.freePlanVerified!==true||config.paidFallback===true)fail('provider_free_plan_unverified');
   if(typeof deps.onUnexpectedUsage!=='function')fail('tavily_usage_guard_required');
   if(typeof config.apiKey!=='string'||!config.apiKey.trim()||controls.test(config.apiKey)||config.apiKey.length>500)fail('provider_credentials_missing');
   if(config.metadataPersistenceApproved===true&&!reference(config.metadataPersistenceApprovalRef))fail('metadata_persistence_approval_required');
   const at=clock(),retrievedAt=now??at;if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||typeof retrievedAt!=='string'||!Number.isFinite(Date.parse(retrievedAt)))fail('invalid_provider_clock');
   if(signal?.aborted)fail('provider_request_cancelled');
   // Root supplies a persistent, atomic, account-wide free quota reservation.
   await authorizeProviderCall({...config,clock},deps.reserveBudget,'tavily_search');
   if(signal?.aborted)fail('provider_request_cancelled');
   const domainFilter=normalized.filterTranslation.value?{include_domains:[normalized.filterTranslation.value],include_domains_mode:'restrict'}:{};
   const response=await providerJSON(fetchImpl,ENDPOINT,{signal,timeoutMs:config.timeoutMs,headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json'},body:{query:normalized.providerQuery,search_depth:'basic',auto_parameters:false,include_answer:false,include_raw_content:false,include_images:false,include_image_descriptions:false,include_favicon:false,max_results:5,include_usage:true,topic:'general',country:'brazil',language:'portuguese',...domainFilter,exact_match:true}});
   const credits=record(response)&&record(response.usage)?response.usage.credits:undefined;
   if(credits!==1){
    paused=true;
    // Only bounded accounting metadata reaches the persistent pause callback.
    try{await deps.onUnexpectedUsage({provider:'tavily_search',code:'tavily_credit_mismatch',expectedCredits:1,actualCredits:Number.isFinite(credits)&&credits>=0&&credits<=1_000_000?credits:null});}catch{}
    fail('tavily_credit_mismatch');
   }
   if(!record(response)||!Array.isArray(response.results)||response.results.length>5)fail('provider_invalid_response');
   const found=[],seen=new Set();
   for(const item of response.results){
    if(!record(item)||typeof item.title!=='string')continue;
    const profileUrl=sourceURL(item.url,normalized.filterTranslation),title=item.title.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,300);
    if(!profileUrl||!title||seen.has(profileUrl))continue;seen.add(profileUrl);
    // Build the record from an allowlist. Never copy content, snippets, raw HTML,
    // answers, images, phone numbers, inferred activity or provider score.
    // Legacy storage requires evidence and a verification timestamp. This record
    // attests only that the API returned this URL, never facts about its contents.
    // reviewed:false keeps it outside verifiedFacts and prevents score support.
    const evidence=[{url:profileUrl,fact:'URL retornada por busca programática; conteúdo, identidade e atividade não verificados.',verifiedAt:retrievedAt,observedAt:retrievedAt,verificationScope:'search_result_received',verified:false,reviewed:false}];
    found.push({publicId:await publicIdentity(profileUrl),name:title.slice(0,200),pageTitle:title,profileUrl,candidateType:'web_page',companyVerified:false,provider:'tavily_search',market:typeof market==='string'?market.slice(0,200):null,city:null,requestedCity:'Joinville/SC',locationVerified:false,criteria:{digitalPresence:0,activity:0,standardFit:0,decisionMaker:0,timing:0},activityVerified:false,consent:null,reviewed:false,mock:false,evidence,provenance:{provider:'tavily_search',originalQuery:normalized.originalQuery,providerQuery:normalized.providerQuery,filterTranslation:{...normalized.filterTranslation},retrievedAt,verified:false,reviewed:false},persistenceAllowed:config.metadataPersistenceApproved===true,metadataPersistenceApprovalRef:config.metadataPersistenceApproved===true?config.metadataPersistenceApprovalRef:null,retentionPolicy:RETENTION});
   }
   return found;
  },
 };
}
