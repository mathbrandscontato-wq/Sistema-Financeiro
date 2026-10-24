import {localClock} from './policy.mjs';
import {ProspectingStore} from './store.mjs';
import {runDailyResearch} from './research.mjs';

export const RESEARCH_SCHEDULE={timeZone:'America/Sao_Paulo',hour:10,minute:30,days:'every_day'};
// Cloud scheduler is expected to call at 10h30. Late delivery/retry is accepted on
// the same local date; research is allowed on weekends and holidays.
export function scheduleDecision({now=new Date().toISOString(),scheduledAt=now,enabled=false}={}){
 if(enabled!==true)return {due:false,reason:'scheduler_disabled'};
 const epoch=Date.parse(now),scheduled=Date.parse(scheduledAt);
 if(!Number.isFinite(epoch)||!Number.isFinite(scheduled))throw new Error('invalid_schedule_time');
 if(scheduled>epoch)return {due:false,reason:'future_schedule'};
 const current=localClock(now),target=localClock(scheduledAt);
 if(current.day!==target.day)return {due:false,reason:'stale_schedule'};
 if(target.minutes<630||current.minutes<630)return {due:false,reason:'before_1030'};
 return {due:true,reason:'eligible',day:current.day};
}

// Integration seam for a Cloudflare scheduled handler or an authenticated job route.
// The caller must derive owner/config from trusted server state, never request JSON.
export function createSchedulerHandler({markets,providerFactory,loadConfig,loadExistingWork=async()=>[],loadContextualQueries=async()=>[],clock=()=>new Date().toISOString(),newToken=()=>crypto.randomUUID()}={}){
 if(typeof loadConfig!=='function'||typeof providerFactory!=='function')throw new Error('invalid_scheduler_dependencies');
 return async function scheduledResearch(event,env){
  if(!env?.DB)throw new Error('research_database_unavailable');
  const config=await loadConfig(env),now=clock(),scheduledAt=event?.scheduledTime===undefined?now:new Date(event.scheduledTime).toISOString();
  const decision=scheduleDecision({now,scheduledAt,enabled:config?.researchEnabled===true});
  if(!decision.due)return {status:'skipped',reason:decision.reason};
  if(typeof config.owner!=='string'||!config.owner)throw new Error('research_owner_unconfigured');
  const provider=await providerFactory(config,env);
  const result=await runDailyResearch({store:new ProspectingStore(env.DB),owner:config.owner,token:newToken(),markets,provider,config,clock,existingWork:await loadExistingWork(config,env),contextualQueries:await loadContextualQueries(config,env),priorities:config.priorities});
  return {status:result.status,day:decision.day,mode:provider.mode,queries:result.report?.attemptedQueries||0,existingWork:result.existingWork||[]};
 };
}
