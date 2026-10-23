import {normalizeRecipient} from './policy.mjs';

// An exhausted free allowance stops work. This module never authorizes paid usage.
export const FREE_PROVIDER_LIMITS=Object.freeze({
 meta_whatsapp:Object.freeze({minute:10,day:100,month:3000}),
 resend:Object.freeze({minute:3,day:20,month:600}),
 cloudflare_ai:Object.freeze({minute:3,day:20,month:620}),
 tavily_search:Object.freeze({minute:20,day:20,month:620}),
});
export function freePlanCurrent(config={},at=new Date().toISOString()){
 if(!config||typeof config!=='object'||Array.isArray(config))return false;
 const epoch=Date.parse(at),until=Date.parse(config.freePlanReviewThrough);
 return config.costMode==='free_only'&&config.estimatedCostMicros===0&&config.freePlanVerified===true&&typeof config.approvalRef==='string'&&config.approvalRef.length>0&&Number.isFinite(epoch)&&Number.isFinite(until)&&until>epoch&&until-epoch<=31*86400000;
}
export function freeServiceWindow(lastInbound,at=new Date().toISOString()){
 const epoch=Date.parse(at),inbound=Date.parse(lastInbound);
 // Reserve a two-minute margin for the network request at the end of the window.
 return Number.isFinite(epoch)&&Number.isFinite(inbound)&&inbound<=epoch&&epoch-inbound<86400000-120000;
}
export function createFreeUsageGuard({db,owner,attemptPrefix,clock=()=>new Date().toISOString(),planForProvider=()=>null}={}){
 let sequence=0;
 return async({provider,costMicros,recipient,template}={})=>{
  const limits=typeof provider==='string'&&Object.hasOwn(FREE_PROVIDER_LIMITS,provider)?FREE_PROVIDER_LIMITS[provider]:null,epoch=Date.parse(clock()),at=Number.isFinite(epoch)?new Date(epoch).toISOString():null;
  if(!limits||costMicros!==0||!Number.isFinite(epoch)||typeof owner!=='string'||!owner||typeof attemptPrefix!=='string'||!attemptPrefix||attemptPrefix.length>160||!freePlanCurrent(planForProvider(provider),at))return false;
  let phone=null;
  if(provider==='meta_whatsapp'){
   if(template)return false;
   try{phone=normalizeRecipient(recipient);}catch{return false;}
  }
  const date=new Date(epoch),minuteEpoch=Math.floor(epoch/60000)*60000,minute=new Date(minuteEpoch).toISOString(),minuteEnd=new Date(minuteEpoch+60000).toISOString(),day=date.toISOString().slice(0,10)+'T00:00:00.000Z',dayEnd=new Date(Date.parse(day)+86400000).toISOString(),month=date.toISOString().slice(0,7)+'-01T00:00:00.000Z',monthEnd=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)).toISOString();
  const providerKey='free:'+provider,attempt=attemptPrefix+':free:'+sequence++;
  // Quotas are global for the shared provider account, not reset per CRM owner.
  // A single INSERT fences concurrent reservations for minute/day/month together.
  const windowSql=phone?' AND EXISTS(SELECT 1 FROM prospecting_conversations WHERE owner=? AND recipient=? AND paused=0 AND opted_out=0 AND last_real_inbound>? AND last_real_inbound<=?)':'';
  // Count the whole UTC period so clock skew between concurrent workers cannot
  // hide reservations with a slightly later timestamp in that same period.
  const args=[owner,date.toISOString().slice(0,10),providerKey,attempt,at,providerKey,minute,minuteEnd,limits.minute,providerKey,day,dayEnd,limits.day,providerKey,month,monthEnd,limits.month];
  if(phone)args.push(owner,phone,new Date(epoch-86400000+120000).toISOString(),at);
  const result=await db.prepare(`INSERT INTO prospecting_costs(owner,day,provider,attempt,cost_micros,created) SELECT ?,?,?,?,0,? WHERE (SELECT COUNT(*) FROM prospecting_costs WHERE provider=? AND created>=? AND created<?)<? AND (SELECT COUNT(*) FROM prospecting_costs WHERE provider=? AND created>=? AND created<?)<? AND (SELECT COUNT(*) FROM prospecting_costs WHERE provider=? AND created>=? AND created<?)<?${windowSql} ON CONFLICT DO NOTHING`).bind(...args).run();
  return result?.meta?.changes===1;
 };
}
