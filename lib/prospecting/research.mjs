import {localClock} from './policy.mjs';
import {canonicalIdentity} from './store.mjs';

const INITIAL_PRIORITIES=['Consultorias e assessorias empresariais','Fotógrafos','Arquitetos e Designers de Interiores'];
const validDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
const positive=(value,name,max)=>{if(!Number.isSafeInteger(value)||value<1||value>max)throw new Error(name);return value;};
const zeroPositive=(value,name,max)=>{if(!Number.isSafeInteger(value)||value<0||value>max)throw new Error(name);return value;};
const iso=value=>{const now=typeof value==='string'?value:new Date(value).toISOString();if(!Number.isFinite(Date.parse(now)))throw new Error('invalid_clock');return now;};

function libraryCheck(markets){
 if(!Array.isArray(markets)||markets.length!==15||new Set(markets.map(m=>m.name)).size!==15||markets.some(m=>typeof m.name!=='string'||!Array.isArray(m.queries)||m.queries.length!==6||m.queries.some(q=>typeof q!=='string'||!q.trim()||q.length>400)))throw new Error('invalid_research_library');
}
function slots(total){
 const rows=[{key:'priority',weight:.60},{key:'rotation',weight:.25},{key:'context',weight:.15}].map((r,index)=>({...r,index,count:Math.floor(total*r.weight),remainder:total*r.weight%1}));
 let left=total-rows.reduce((n,r)=>n+r.count,0);
 for(const row of [...rows].sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(left--<=0)break;row.count++;}
 return Object.fromEntries(rows.map(r=>[r.key,r.count]));
}
function pick(pool,count,ordinal){
 if(!pool.length)return [];
 const start=(ordinal*Math.max(1,count))%pool.length;
 return Array.from({length:Math.min(count,pool.length)},(_,index)=>pool[(start+index)%pool.length]);
}

// The original 90 strings remain unchanged. Context slots are unused when there is no
// approved referral/event; absence of data never creates a reason to contact someone.
export function buildResearchPlan({day,markets,maxQueries=6,priorities=INITIAL_PRIORITIES,contextualQueries=[]}){
 libraryCheck(markets);if(!validDay(day))throw new Error('invalid_research_day');positive(maxQueries,'invalid_query_limit',90);
 if(!Array.isArray(priorities)||priorities.length<1||priorities.length>3||new Set(priorities).size!==priorities.length||priorities.some(p=>!markets.some(m=>m.name===p)))throw new Error('invalid_research_priorities');
 if(!Array.isArray(contextualQueries)||contextualQueries.length>100)throw new Error('invalid_contextual_queries');
 const ordinal=Math.floor(Date.parse(day+'T12:00:00Z')/86400000),allocation=slots(maxQueries);
 const pool=markets.flatMap((market,marketIndex)=>market.queries.map((query,queryIndex)=>({id:`base-${marketIndex+1}-${queryIndex+1}`,market:market.name,query})));
 const priority=pool.filter(row=>priorities.includes(row.market)),rotation=pool.filter(row=>!priorities.includes(row.market));
 const context=contextualQueries.filter(row=>row?.approved===true&&['referral','event'].includes(row.kind)&&typeof row.evidenceRef==='string'&&row.evidenceRef.length>0&&typeof row.query==='string'&&row.query.trim()&&row.query.length<=400&&markets.some(m=>m.name===row.market)).map((row,index)=>({id:`context-${index+1}`,market:row.market,query:row.query,kind:row.kind,evidenceRef:row.evidenceRef}));
 const entries=[...pick(priority,allocation.priority,ordinal).map(r=>({...r,lane:'priority'})),...pick(rotation,allocation.rotation,ordinal).map(r=>({...r,lane:'rotation'})),...pick(context,allocation.context,ordinal).map(r=>({...r,lane:'context'}))];
 return {version:1,day,allocation,unusedContextSlots:Math.max(0,allocation.context-context.length),entries};
}

export function prioritizeExistingWork(items=[],now=new Date().toISOString()){
 if(!Array.isArray(items)||items.length>1000)throw new Error('invalid_existing_work');const epoch=Date.parse(iso(now));
 return items.filter(item=>item&&typeof item.id==='string'&&['interested','agreed_return'].includes(item.kind)&&item.optOut!==true&&item.closed!==true&&(item.kind==='interested'||(Number.isFinite(Date.parse(item.dueAt))&&Date.parse(item.dueAt)<=epoch))).map(item=>({id:item.id,kind:item.kind,dueAt:item.dueAt||null,action:item.paused?'human_followup':'review_before_outreach'})).sort((a,b)=>(a.kind==='interested'?0:1)-(b.kind==='interested'?0:1)||(a.dueAt||'').localeCompare(b.dueAt||'')||a.id.localeCompare(b.id));
}

const canonicalURL=value=>{try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;url.hash='';url.search='';return url.href.replace(/\/$/,'');}catch{return null;}};
export function identityAliases(company){
 const strong=[];
 if(company?.publicId&&/^[a-zA-Z0-9_-]{3,100}$/.test(company.publicId))strong.push('id:'+company.publicId);
 const profile=canonicalURL(company?.profileUrl);if(profile)strong.push('profile:'+profile);
 const website=canonicalURL(company?.website||company?.websiteUri);
 const weak=[];if(website)weak.push('website:'+new URL(website).hostname.toLowerCase());
 if(typeof company?.name==='string')weak.push('name:'+company.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
 return {strong:[...new Set(strong)],weak:[...new Set(weak)]};
}
// Weak matches are only review hints. Never merge by domain, name or public phone.
export function reconcileIdentity(company,known=[]){
 const aliases=identityAliases(company),strong=[],ambiguous=[];
 for(const row of known){const candidate=identityAliases(row.company||row);if(aliases.strong.some(key=>candidate.strong.includes(key)))strong.push(row.identity||canonicalIdentity(row.company||row));else if(aliases.weak.some(key=>candidate.weak.includes(key)))ambiguous.push(row.identity||canonicalIdentity(row.company||row));}
 const exact=[...new Set(strong)];
 return exact.length===1?{decision:'duplicate',identity:exact[0],ambiguous:[]}:(exact.length>1?{decision:'review',identity:null,ambiguous:exact}:{decision:ambiguous.length?'review':'new',identity:null,ambiguous:[...new Set(ambiguous)]});
}

const CHECKPOINT_SQL=`UPDATE prospecting_runs SET report=?,lease_until=? WHERE owner=? AND local_day=? AND token=? AND status='running' AND lease_until>=?`;
const DONE_SQL=`UPDATE prospecting_runs SET status=?,report=?,lease_until=0 WHERE owner=? AND local_day=? AND token=? AND status='running' AND lease_until>=?`;
function allowedProvider(provider,config){
 if(!provider||typeof provider.search!=='function'||!['mock','authorized'].includes(provider.mode))throw new Error('invalid_research_provider');
 positive(config.maxQueries,'invalid_query_limit',90);zeroPositive(config.maxCostMicros,'invalid_cost_limit',1_000_000_000_000);zeroPositive(config.costPerQueryMicros,'invalid_query_cost',1_000_000_000_000);
 positive(config.timeoutMs??15000,'invalid_research_timeout',120000);
 positive(config.knownCompanyLimit??500,'invalid_known_company_limit',2000);
 const free=config.costPolicy==='free_only'||provider.costMode==='free_only';
 if(free&&(config.costPolicy!=='free_only'||config.maxQueries>20||config.costPerQueryMicros!==0||config.maxCostMicros!==0))throw new Error('zero_cost_research_required');
 if(provider.mode==='authorized'&&(config.allowLiveResearch!==true||typeof provider.id!=='string'||!provider.id||(free?(provider.id!=='tavily_search'||provider.costMode!=='free_only'):config.costPerQueryMicros<1)))throw new Error('live_research_not_approved');
}
async function queryWithTimeout(provider,query,context,timeoutMs){
 const controller=new AbortController();let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('research_timeout'));},timeoutMs);});
 try{return await Promise.race([provider.search(query,{...context,signal:controller.signal}),timeout]);}finally{clearTimeout(timer);}
}

// Executes programmatic research only. No message transport is called here.
export async function runDailyResearch({store,owner,token,markets,provider,config={},clock=()=>new Date().toISOString(),existingWork=[],contextualQueries=[],priorities=INITIAL_PRIORITIES}){
 allowedProvider(provider,config);if(typeof owner!=='string'||!owner||typeof token!=='string'||!token)throw new Error('invalid_run_identity');
 const started=iso(clock()),day=localClock(started).day,plan=buildResearchPlan({day,markets,maxQueries:config.maxQueries,contextualQueries,priorities});
 const work=prioritizeExistingWork(existingWork,started);
 if(!await store.claim(owner,started,token))return {status:'not_claimed',existingWork:work};
 let row=await store.db.prepare('SELECT report FROM prospecting_runs WHERE owner=? AND local_day=? AND token=?').bind(owner,day,token).first();
 let previous;try{previous=JSON.parse(row?.report||'{}');}catch{throw new Error('invalid_research_checkpoint');}
 // Old failed reports cannot establish a trustworthy live spend ledger.
 if(previous.version!==2&&provider.mode==='authorized'&&Object.keys(previous).length)throw new Error('unverified_previous_budget');
 let report=previous.version===2?previous:{version:2,day,mode:provider.mode,providerId:provider.id||'mock',costPolicy:config.costPolicy||'legacy',plan,entries:[],identityHashes:[],spentMicros:0,attemptedQueries:0,results:0,saved:0,duplicates:0,review:0,restrictedResults:0,persistenceReview:0,markets:{},errors:0,started,updated:started};
 if(!report.plan?.entries||!Array.isArray(report.entries)||!Array.isArray(report.identityHashes)||!Number.isSafeInteger(report.spentMicros)||report.spentMicros<0||!Number.isSafeInteger(report.attemptedQueries)||report.attemptedQueries<0)throw new Error('invalid_research_checkpoint');
 if(report.day!==day||report.mode!==provider.mode||report.providerId!==(provider.id||'mock')||report.plan.entries.some(entry=>!plan.entries.some(p=>p.id===entry.id&&p.query===entry.query)))throw new Error('research_configuration_changed');
 if(config.costPolicy==='free_only'&&(report.costPolicy!=='free_only'||report.spentMicros!==0||report.entries.some(entry=>entry.chargedMicros!==0)))throw new Error('zero_cost_checkpoint_required');
 const checkpoint=async()=>{const at=iso(clock()),epoch=Date.parse(at);if(localClock(at).day!==day)throw new Error('research_day_changed');const changed=await store.db.prepare(CHECKPOINT_SQL).bind(JSON.stringify({...report,updated:at}),epoch+300000,owner,day,token,epoch).run();if(changed.meta.changes!==1)throw new Error('research_lease_lost');};
 const finish=async status=>{const at=iso(clock()),result=await store.db.prepare(DONE_SQL).bind(status,JSON.stringify({...report,updated:at}),owner,day,token,Date.parse(at)).run();if(result.meta.changes!==1)throw new Error('research_lease_lost');};
 try{
  await checkpoint();
  const knownLimit=config.knownCompanyLimit??500;
  const knownRows=(await store.db.prepare('SELECT identity,data FROM prospecting_companies WHERE owner=? ORDER BY updated DESC,identity ASC LIMIT ?').bind(owner,knownLimit+1).all()).results;
  const known=[];let invalidKnownRows=0;
  for(const row of knownRows.slice(0,knownLimit)){
   try{const company=JSON.parse(row.data);if(!company||typeof company!=='object'||company.persistenceAllowed===false){invalidKnownRows++;continue;}known.push({identity:row.identity,company});}catch{invalidKnownRows++;}
  }
  report.knownCoverage={limit:knownLimit,loaded:known.length,limited:knownRows.length>knownLimit,invalidRows:invalidKnownRows};
  // Additive counters keep earlier v2 checkpoints compatible without changing the
  // spent-query ledger. Restricted provider content is never copied into a report.
  report.restrictedResults??=0;report.persistenceReview??=0;
  for(const entry of report.plan.entries){
   if(report.entries.some(record=>record.id===entry.id))continue;
   if(report.attemptedQueries>=config.maxQueries||report.spentMicros+config.costPerQueryMicros>config.maxCostMicros)break;
   delete report.pauseReason;
   const record={id:entry.id,state:'reserved',market:entry.market,chargedMicros:config.costPerQueryMicros};report.entries.push(record);report.attemptedQueries++;report.spentMicros+=config.costPerQueryMicros;
   report.markets[entry.market]??={queries:0,results:0,saved:0,errors:0,restricted:0};report.markets[entry.market].queries++;
   // Persist the cost reservation before the HTTP request; a crash cannot silently
   // reset the daily budget or blindly reissue an uncertain charged query.
   await checkpoint();
   try{
    const at=iso(clock()),found=await queryWithTimeout(provider,entry.query,{now:at,market:entry.market},config.timeoutMs??15000);
    if(!Array.isArray(found)||found.length>100)throw new Error('invalid_research_result');
    await checkpoint();
    for(const company of found){
     report.results++;report.markets[entry.market].results++;
     if(company?.persistenceAllowed===false){
      report.restrictedResults++;report.persistenceReview++;report.markets[entry.market].restricted=(report.markets[entry.market].restricted||0)+1;
      continue;
     }
     const match=reconcileIdentity(company,known);if(match.decision==='review')report.review++;
     // A unique strong alias points at a record already present in this owner's
     // queue. Do not create a second canonical record for a second data source.
     // Existing evidence is preserved; updating/merging it requires explicit review.
     if(match.decision==='duplicate'){report.duplicates++;continue;}
     const candidate={...company,mock:provider.mode==='mock',researchAliases:identityAliases(company),identityReviewRequired:match.decision==='review'};
     if(match.decision==='review'&&known.some(row=>row.identity===canonicalIdentity(candidate)))continue;
     const identity=await store.saveCompany(owner,entry.market,candidate,iso(clock()),{day,token});
     const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))),b=>b.toString(16).padStart(2,'0')).join('');
     if(report.identityHashes.includes(hash))report.duplicates++;else {report.identityHashes.push(hash);report.saved++;report.markets[entry.market].saved++;}
     if(!known.some(row=>row.identity===identity))known.push({identity,company:candidate});
    }
    record.state='complete';await checkpoint();
   }catch(error){
    if(error?.message==='research_lease_lost'||error?.message==='lease_lost'||error?.message==='research_day_changed')throw error;
    const stopCode=config.costPolicy==='free_only'&&(['provider_free_quota_exhausted','provider_quota_unavailable','provider_free_plan_unverified','provider_disabled','tavily_credit_mismatch','tavily_usage_review_required'].includes(error?.code)?error.code:error?.status===429?'provider_rate_limit':null);
    record.state='uncertain';record.reason=stopCode|| (error?.message==='research_timeout'?'timeout':'provider_or_validation_failure');report.errors++;report.markets[entry.market].errors++;if(stopCode)report.pauseReason=stopCode;await checkpoint();
    // Quota, plan and usage failures stop the batch; no paid provider or retries.
    if(stopCode)break;
   }
  }
  const pending=report.plan.entries.filter(entry=>!report.entries.some(record=>record.id===entry.id)).length;
  const status=report.entries.some(entry=>entry.state!=='complete')||pending?'partial':'complete';report.pendingQueries=pending;
  // A partial run remains retryable, but reserved/uncertain entries are skipped.
  await finish(status==='complete'?'complete':'failed');
  return {status,report,existingWork:work};
 }catch(error){
  // Do not overwrite a replacement worker's report. The fenced update also rejects
  // completion after lease expiry. Its next invocation can recover unattempted work.
  try{await finish('failed');}catch{}
  throw error;
 }
}
