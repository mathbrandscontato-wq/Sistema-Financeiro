import {createCommercialAgent} from './agent.mjs';
import {authorizeProviderCall,providerJSON,ProviderError} from './providers.mjs';

const MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_PAYLOAD_BYTES=8000;
const MAX_OUTPUT_TOKENS=500;

function freeConfiguration(config,clock){
 if(!/^[a-f0-9]{32}$/i.test(config.accountId||'')||typeof config.apiToken!=='string'||!/^[\x21-\x7e]{1,4096}$/.test(config.apiToken))throw new ProviderError('cloudflare_credentials_unconfigured');
 const now=Date.parse(clock()),review=Date.parse(config.freePlanReviewThrough);
 if(config.costMode!=='free_only'||config.estimatedCostMicros!==0||config.freePlanVerified!==true||typeof config.freePlanReviewThrough!=='string'||!Number.isFinite(now)||!Number.isFinite(review)||review<=now)throw new ProviderError('cloudflare_free_plan_unverified');
}

function usageCounts(usage={}){
 const inputTokens=usage.prompt_tokens??usage.input_tokens??0,outputTokens=usage.completion_tokens??usage.output_tokens??0;
 if(!Number.isSafeInteger(inputTokens)||inputTokens<0||!Number.isSafeInteger(outputTokens)||outputTokens<0||outputTokens>MAX_OUTPUT_TOKENS)throw new ProviderError('cloudflare_invalid_usage');
 return {inputTokens,outputTokens};
}

// No automatic retries, tools, Gateway routing, paid transport, or alternate model.
export function createCloudflareCommercialAgent(config={},deps={}){
 const clock=deps.clock||(()=>new Date().toISOString()),settings={...config,clock};
 const generatePlan=async(context,{schema,instructions})=>{
  freeConfiguration(settings,clock);
  const body={messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({untrustedData:context})}],max_tokens:MAX_OUTPUT_TOKENS,response_format:{type:'json_schema',json_schema:schema}};
  if(new TextEncoder().encode(JSON.stringify(body)).byteLength>MAX_PAYLOAD_BYTES)throw new ProviderError('cloudflare_context_too_large');
  await authorizeProviderCall(settings,deps.reserveBudget,'cloudflare_ai');
  const response=await providerJSON(deps.fetchImpl||globalThis.fetch,`https://api.cloudflare.com/client/v4/accounts/${settings.accountId}/ai/run/${MODEL}`,{headers:{Authorization:'Bearer '+settings.apiToken,'Content-Type':'application/json'},body,timeoutMs:settings.timeoutMs});
  if(response?.success!==true||!response.result||typeof response.result!=='object'||Array.isArray(response.result))throw new ProviderError('cloudflare_invalid_response');
  let plan=response.result.response;
  if(typeof plan==='string'){try{plan=JSON.parse(plan);}catch{throw new ProviderError('cloudflare_invalid_json');}}
  if(!plan||typeof plan!=='object'||Array.isArray(plan))throw new ProviderError('cloudflare_invalid_plan');
  return {plan,usage:usageCounts(response.result.usage)};
 };
 return createCommercialAgent(settings,{...deps,generatePlan});
}
