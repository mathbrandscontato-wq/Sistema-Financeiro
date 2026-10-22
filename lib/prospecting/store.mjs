import {localClock,researchDue,grade,normalizeRecipient,contactPolicy} from './policy.mjs';
import {RESERVE_SQL,CLAIM_SQL,FINISH_SQL} from './sql.mjs';

export function canonicalIdentity(company){
 if(company.publicId&&/^[a-zA-Z0-9_-]{3,100}$/.test(company.publicId))return 'id:'+company.publicId;
 // A full canonical business profile preserves paths; shared hosting is not an identity.
 const u=new URL(company.profileUrl);if(u.protocol!=='https:'||u.username||u.password)throw new Error('invalid_identity');
 u.hash='';u.search='';return 'profile:'+u.toString().replace(/\/$/,'');
}
function checkedEvidence(company,now){
 if(typeof company.name!=='string'||!company.name.trim()||company.name.length>200)throw new Error('invalid_company');
 if(!company.evidence?.length)throw new Error('missing_evidence');
 for(const e of company.evidence){const u=new URL(e.url);if(u.protocol!=='https:'||typeof e.fact!=='string'||!e.fact.trim()||e.fact.length>1000||!Number.isFinite(Date.parse(e.verifiedAt))||Date.parse(e.verifiedAt)>Date.parse(now))throw new Error('invalid_evidence');}
 // Every non-zero score requires a reviewed source reference for that criterion.
 for(const [key,value] of Object.entries(company.criteria||{})){if(value>0&&!company.evidence.some(e=>e.criterion===key&&e.reviewed===true))throw new Error('unsupported_score');}
}
export class ProspectingStore{
 constructor(db){this.db=db;}
 async claim(owner,now,token){
  if(!researchDue(now))return false;
  const epoch=Date.parse(now),day=localClock(now).day;
  const r=await this.db.prepare(CLAIM_SQL).bind(owner,day,token,epoch+300000,epoch).run();return r.meta.changes===1;
 }
 async saveCompany(owner,market,company,now,run=null){
  checkedEvidence(company,now);const identity=canonicalIdentity(company),scored=grade(company.criteria,company.excluded===true);
  const fence=run?` WHERE EXISTS(SELECT 1 FROM prospecting_runs WHERE owner=? AND local_day=? AND token=? AND status='running')`:'';
  const args=[owner,identity,market,JSON.stringify({...company,mock:company.mock===true}),scored.score,scored.grade,now,now];
  if(run)args.push(owner,run.day,run.token);
  const result=await this.db.prepare(`INSERT INTO prospecting_companies(owner,identity,market,data,score,grade,created,updated) SELECT ?,?,?,?,?,?,?,?${fence||' WHERE 1'} ON CONFLICT(owner,identity) DO UPDATE SET data=excluded.data,score=excluded.score,grade=excluded.grade,updated=excluded.updated`).bind(...args).run();
  if(result.meta.changes!==1)throw new Error('lease_lost');
  return identity;
 }
 async reserve({account,phone,now,attemptKey,...policy}){
  const reason=contactPolicy({now,...policy});if(reason!=='allowed')return {ok:false,reason};
  const recipient=normalizeRecipient(phone),day=localClock(now).day;
  const r=await this.db.prepare(RESERVE_SQL).bind(account,day,recipient,attemptKey,now,account,recipient,account,day).run();
  // Replays never create permission to send a second time. Uncertain attempts stay reserved.
  return {ok:r.meta.changes===1,reason:r.meta.changes===1?'reserved':'already_reserved_or_limit'};
 }
 async recordHandoff({owner,opportunityId,eventId,summary,now}){
  if(typeof summary!=='string'||summary.length>2000)throw new Error('invalid_summary');
  // Link only to an existing opportunity belonging to the same owner.
  const r=await this.db.prepare(`INSERT INTO prospecting_handoffs(owner,event_id,opportunity_id,summary,status,created) SELECT ?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM commercial_opportunities WHERE owner=? AND id=?) ON CONFLICT(owner,event_id) DO NOTHING`).bind(owner,eventId,opportunityId,summary,now,owner,opportunityId).run();
  return r.meta.changes===1;
 }
}

export async function runResearch({store,owner,now,token,markets,provider,maxQueries=6}){
 if(provider.mode!=='mock')throw new Error('live_research_not_enabled');
 if(!Number.isInteger(maxQueries)||maxQueries<1||maxQueries>90)throw new Error('invalid_query_budget');
 if(markets.length!==15||markets.some(m=>m.queries.length!==6))throw new Error('invalid_library');
 if(!await store.claim(owner,now,token))return {status:'not_claimed'};
 const day=localClock(now).day,report={mode:'mock',queries:0,results:0,unique:0,errors:0,markets:[]},seen=new Set();
 // Stable rotating market and query offset; retries reuse the same plan.
 const offset=Math.floor(Date.parse(day+'T12:00:00Z')/86400000)%90;
 try{
  for(let i=0;i<maxQueries;i++){
   const n=(offset+i)%90,m=markets[n%15],query=m.queries[Math.floor(n/15)];report.queries++;report.markets.push(m.name);
   const companies=await provider.search(query);if(!Array.isArray(companies)||companies.length>100)throw new Error('invalid_provider_result');
   for(const c of companies){report.results++;const key=await store.saveCompany(owner,m.name,{...c,mock:true},now,{day,token});seen.add(key);}
  }
  report.unique=seen.size;report.markets=[...new Set(report.markets)];
  const done=await store.db.prepare(FINISH_SQL).bind('complete',JSON.stringify(report),owner,day,token).run();
  if(done.meta.changes!==1)throw new Error('lease_lost');return {status:'complete',...report};
 }catch(e){report.errors++;await store.db.prepare(FINISH_SQL).bind('failed',JSON.stringify(report),owner,day,token).run();throw e;}
}
