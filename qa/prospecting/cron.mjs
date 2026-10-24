import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import timer from '../../worker/commercial-cron.mjs';
import {RuntimeStore} from '../../lib/prospecting/runtime-store.mjs';
import {runCommercialJob} from '../../lib/prospecting/server.mjs';

// Integrate the real timer, authenticated job, scheduler and durable SQLite run.
// The transport and search responses are local fixtures; no cloud activation.
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
function statement(sql,args=[]){return {sql,args,bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}
const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const owner='cron-fixture',store=new RuntimeStore(db),markets=JSON.parse(readFileSync('data/prospecting-markets.json','utf8'));
const calendar=JSON.parse(readFileSync('data/commercial-calendar-joinville-2026.json','utf8')).calendar;
let at='2026-10-24T13:30:00.000Z',requests=0,queries=0,failResponse=false;const responses=[];
const clock=()=>at,jobSecret='fixture-job-secret',timerEnv={SCHEDULE_ENABLED:'true',CRM_SITE_TOKEN:'fixture-sites-token',COMMERCIAL_JOB_SECRET:jobSecret};
const jobEnv={DB:db,COMMERCIAL_OWNER:owner,COMMERCIAL_JOB_SECRET:jobSecret,COMMERCIAL_SCHEDULER_ENABLED:'true'};
await store.configureAccount(owner,{account:'fixture-scheduled-account',dryRun:true,killSwitch:false,config:{costPolicy:'free_only',budgets:{limitMicros:0,estimates:{}},calendar,research:{researchEnabled:true,maxQueries:20,maxCostMicros:0,costPerQueryMicros:0,timeoutMs:1000}}},at);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 requests++;assert.equal(url,'https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site/api/commercial-job');
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.ok(options.signal);
 assert.equal(options.headers['OAI-Sites-Authorization'],'Bearer '+timerEnv.CRM_SITE_TOKEN);
 assert.equal(options.headers.Authorization,'Bearer '+jobSecret);
 assert.deepEqual(Object.keys(JSON.parse(options.body)),['scheduledAt']);
 if(failResponse)return new Response('fixture-private-error',{status:503});
 const result=await runCommercialJob(new Request(url,options),jobEnv,{clock,markets,mockProvider:{id:'offline-cron-fixture',mode:'mock',async search(){queries++;return [];}}});
 responses.push(await result.clone().json());return result;
};
async function trigger(environment=timerEnv,scheduledAt=at){
 const pending=[];await timer.scheduled({scheduledTime:Date.parse(scheduledAt)},environment,{waitUntil:p=>pending.push(p)});
 await Promise.all(pending);
}
try{
 await trigger({});assert.equal(requests,0);
 await assert.rejects(()=>trigger({SCHEDULE_ENABLED:'true'}),/scheduler_credentials_unconfigured/);assert.equal(requests,0);
 assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at)),'10:30');
 await trigger();assert.equal(responses.at(-1).research.status,'complete');assert.equal(queries,17,'60/25 slots run; absent approved context stays empty');
 await trigger();assert.equal(queries,17,'duplicate same-day timer cannot repeat completed searches');
 for(const day of ['2026-10-25','2026-11-20']){at=day+'T13:30:00.000Z';await trigger();assert.equal(responses.at(-1).research.status,'complete');}
 assert.equal(queries,51,'research is independent of weekend and holiday outreach blocks');
 at='2026-10-26T13:29:00.000Z';await trigger();assert.equal(responses.at(-1).research.reason,'before_1030');assert.equal(queries,51);
 at='2026-10-27T13:30:00.000Z';await trigger(timerEnv,'2026-10-26T13:30:00.000Z');assert.equal(responses.at(-1).research.reason,'stale_schedule');assert.equal(queries,51);
 const unauthorized=await runCommercialJob(new Request('https://example.invalid/api/commercial-job',{method:'POST',headers:{Authorization:'Bearer wrong-fixture'},body:'{}'}),jobEnv,{clock,markets});assert.equal(unauthorized.status,401);
 const beforeFailure=requests;failResponse=true;await assert.rejects(()=>trigger(),error=>error.message==='commercial_job_not_confirmed');assert.equal(requests,beforeFailure+1,'no blind timer retry after an uncertain result');
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM prospecting_runs').get().n,3);
 for(const table of ['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments','financial_history','prospecting_outbox'])assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 const template=readFileSync('worker/wrangler.commercial.example.toml','utf8');assert.match(template,/SCHEDULE_ENABLED\s*=\s*"false"/);assert.match(template,/crons\s*=\s*\["30 13 \* \* \*"\]/);
 console.log('PASS: timer -> job autenticado -> pesquisa persistente, 10h30 São Paulo, fim de semana/feriado, idempotência, evento antigo recusado, falha sem repetição e template desligado; zero rede real.');
}finally{globalThis.fetch=originalFetch;sqlite.close();}
