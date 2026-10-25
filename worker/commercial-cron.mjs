// Optional dedicated cloud timer. No app/session/desktop needs to remain open.
// Deploy only after Sites service access and the job writer have been homologated.
export default {
 async scheduled(event,env,ctx){
  if(env.SCHEDULE_ENABLED!=='true')return;
  if(!env.CRM_SITE_TOKEN||!env.COMMERCIAL_JOB_SECRET)throw new Error('scheduler_credentials_unconfigured');
  const endpoint='https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site/api/commercial-job';
  ctx.waitUntil((async()=>{
   const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','OAI-Sites-Authorization':'Bearer '+env.CRM_SITE_TOKEN,Authorization:'Bearer '+env.COMMERCIAL_JOB_SECRET},body:JSON.stringify({scheduledAt:new Date(event.scheduledTime).toISOString()}),signal:AbortSignal.timeout(25000),redirect:'error'});
   if(!result.ok)throw new Error('commercial_job_not_confirmed');
  })());
 }
};
