import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {FREE_PROVIDER_LIMITS,createFreeUsageGuard,freePlanCurrent,freeServiceWindow} from '../../lib/prospecting/free-cost.mjs';
import {RuntimeStore} from '../../lib/prospecting/runtime-store.mjs';

const now='2026-10-23T12:00:00.000Z',phone='5547999990100';
const plan=(at=now)=>({costMode:'free_only',estimatedCostMicros:0,freePlanVerified:true,approvalRef:'fixture-free-plan-review',freePlanReviewThrough:new Date(Date.parse(at)+86400000).toISOString()});
function fixture(path=':memory:',migrate=true){
 const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=20000;');
 if(migrate)for(const file of readdirSync(new URL('../../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'));
 const hooks={beforeRun:null};
 function prepared(sql,args=[]){return {sql,args,bind(...a){return prepared(sql,a);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){hooks.beforeRun?.(sql);return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}
 const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {sqlite,db,hooks};
}
const count=sqlite=>sqlite.prepare('SELECT COUNT(*) n FROM prospecting_costs').get().n;
const financial=sqlite=>JSON.stringify(['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments','financial_history'].map(table=>sqlite.prepare('SELECT * FROM '+table+' ORDER BY id').all()));
function conversation(sqlite,owner,at=now,values={}){
 sqlite.prepare('INSERT INTO prospecting_conversations(owner,recipient,last_real_inbound,created,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,recipient) DO UPDATE SET last_real_inbound=excluded.last_real_inbound,paused=0,opted_out=0').run(owner,phone,at,now,now);
 for(const [field,value] of Object.entries(values)){
  assert.ok(['paused','opted_out','last_real_inbound','last_simulated_inbound'].includes(field));
  sqlite.prepare('UPDATE prospecting_conversations SET '+field+'=? WHERE owner=? AND recipient=?').run(value,owner,phone);
 }
}
function guard(f,{owner='owner-a',attemptPrefix='fixture',clock=()=>now,planForProvider=()=>plan(clock())}={}){
 return createFreeUsageGuard({db:f.db,owner,attemptPrefix,clock,planForProvider});
}
const request=provider=>({provider,costMicros:0,...(provider==='meta_whatsapp'?{recipient:phone}:{})});
function seed(sqlite,{provider,n,atForIndex}){
 const insert=sqlite.prepare('INSERT INTO prospecting_costs(owner,day,provider,attempt,cost_micros,created) VALUES(?,?,?,?,0,?)');
 for(let i=0;i<n;i++){const at=atForIndex(i);insert.run('previous-owner-'+(i%2),at.slice(0,10),'free:'+provider,'fixture-history-'+i,at);}
}

if(!isMainThread){
 const f=fixture(workerData.path,false);
 parentPort.postMessage({ready:true});
 parentPort.once('message',async()=>{
  try{
   const reserve=guard(f,{owner:'worker-owner-'+(workerData.id%2),attemptPrefix:'worker-'+workerData.id});
   const results=await Promise.all(Array.from({length:10},()=>reserve(request('resend'))));
   parentPort.postMessage({accepted:results.filter(Boolean).length});
  }catch(error){parentPort.postMessage({error:error.message});}
  finally{f.sqlite.close();parentPort.close();}
 });
}else{
 // Missing or stale plan attestations fail closed, including the default null plan.
 assert.equal(freePlanCurrent(plan(),now),true);
 assert.equal(freePlanCurrent({...plan(),freePlanReviewThrough:new Date(Date.parse(now)+31*86400000).toISOString()},now),true);
 for(const invalid of [null,undefined,[],false,'free',{},
  {...plan(),costMode:'paid'},{...plan(),estimatedCostMicros:1},{...plan(),freePlanVerified:false},
  {...plan(),approvalRef:''},{...plan(),freePlanReviewThrough:now},
  {...plan(),freePlanReviewThrough:'2026-10-22T12:00:00.000Z'},
  {...plan(),freePlanReviewThrough:new Date(Date.parse(now)+31*86400000+1).toISOString()}])assert.equal(freePlanCurrent(invalid,now),false);
 assert.equal(freePlanCurrent(plan(),'invalid'),false);
 {
  const f=fixture(),before=financial(f.sqlite),reserve=guard(f);
  assert.equal(await createFreeUsageGuard({db:f.db,owner:'owner',attemptPrefix:'no-plan',clock:()=>now})(request('resend')),false);
  for(const provider of ['unknown','toString','__proto__','constructor',{},null,undefined])assert.equal(await reserve({provider,costMicros:0}),false);
  for(const costMicros of [undefined,null,-1,1,0.1,'0',NaN,Infinity])assert.equal(await reserve({provider:'resend',costMicros}),false);
  assert.equal(await guard(f,{clock:()=> 'invalid'})(request('resend')),false);
  assert.equal(await guard(f,{planForProvider:()=>null})(request('resend')),false);
  assert.equal(await guard(f,{planForProvider:()=>({...plan(),freePlanReviewThrough:now})})(request('resend')),false);
  assert.equal(count(f.sqlite),0);assert.equal(financial(f.sqlite),before);f.sqlite.close();
 }
 // A failed provider attempt is never refunded or retried past the shared allowance.
 {
  const f=fixture(),reserve=guard(f,{attemptPrefix:'failed-attempt'});let attempted=0;
  async function failAfterReservation(){if(!await reserve(request('resend')))return false;attempted++;throw new Error('fixture-transport-failure');}
  for(let i=0;i<FREE_PROVIDER_LIMITS.resend.minute;i++)await assert.rejects(failAfterReservation,/fixture-transport-failure/);
  assert.equal(await failAfterReservation(),false);assert.equal(attempted,FREE_PROVIDER_LIMITS.resend.minute);
  assert.equal(count(f.sqlite),attempted);f.sqlite.close();
 }
 // Requests observed out of timestamp order still share the same UTC minute.
 {
  const f=fixture();let at='2026-10-23T12:00:59.000Z';
  const reserve=guard(f,{attemptPrefix:'clock-order',clock:()=>at});
  for(let i=0;i<FREE_PROVIDER_LIMITS.resend.minute;i++)assert.equal(await reserve(request('resend')),true);
  at='2026-10-23T12:00:01.000Z';
  assert.equal(await reserve(request('resend')),false,'clock skew inside a quota period cannot hide already-spent attempts');
  f.sqlite.close();
 }
 // Every configured provider has a shared minute cap, including independent CRM owners.
 for(const [provider,limits] of Object.entries(FREE_PROVIDER_LIMITS)){
  const f=fixture(),before=financial(f.sqlite);conversation(f.sqlite,'owner-a');conversation(f.sqlite,'owner-b');
  const a=guard(f,{attemptPrefix:'minute-a'}),b=guard(f,{owner:'owner-b',attemptPrefix:'minute-b'});
  const results=await Promise.all(Array.from({length:limits.minute+12},(_,i)=>(i%2?a:b)(request(provider))));
  assert.equal(results.filter(Boolean).length,limits.minute,provider+' minute cap');
  assert.equal(count(f.sqlite),limits.minute);
  assert.equal(await guard(f,{owner:'owner-c',attemptPrefix:'new-owner'})(request(provider)),false,'owner creation cannot reset allowance');
  assert.equal(await guard(f,{attemptPrefix:'fresh-key'})(request(provider)),false,'new adapter/key reference cannot reset allowance');
  // A successful reservation is spent even when the following network attempt would fail.
  assert.ok(f.sqlite.prepare('SELECT COUNT(*) n FROM prospecting_costs WHERE cost_micros!=0').get().n===0);
  assert.equal(financial(f.sqlite),before);f.sqlite.close();
 }
 // Daily usage remains global after replacing the adapter, then renews at UTC midnight.
 for(const [provider,limits] of Object.entries(FREE_PROVIDER_LIMITS)){
  const f=fixture();let at=now;conversation(f.sqlite,'owner-a');conversation(f.sqlite,'owner-b');
  seed(f.sqlite,{provider,n:limits.day-1,atForIndex:i=>new Date(Date.parse('2026-10-23T08:00:00.000Z')+i*60000).toISOString()});
  assert.equal(await guard(f,{clock:()=>at})(request(provider)),true);
  at='2026-10-23T12:02:00.000Z';
  assert.equal(await guard(f,{owner:'owner-b',attemptPrefix:'daily-restart',clock:()=>at})(request(provider)),false,provider+' daily cap');
  at='2026-10-24T00:00:00.000Z';conversation(f.sqlite,'owner-b',at);
  assert.equal(await guard(f,{owner:'owner-b',attemptPrefix:'next-day',clock:()=>at})(request(provider)),true,provider+' UTC reset');
  f.sqlite.close();
 }
 // Existing month records are counted even when a different owner starts a new day.
 for(const [provider,limits] of Object.entries(FREE_PROVIDER_LIMITS)){
  const f=fixture();let at='2026-10-31T12:00:00.000Z';conversation(f.sqlite,'owner-a',at);conversation(f.sqlite,'owner-b',at);
  seed(f.sqlite,{provider,n:limits.month-1,atForIndex:i=>{
   const day=Math.floor(i/limits.day)+1,minute=i%limits.day;
   return new Date(Date.UTC(2026,9,day,8,minute)).toISOString();
  }});
  assert.equal(await guard(f,{clock:()=>at})(request(provider)),true,provider+' final monthly reservation');
  assert.equal(await guard(f,{owner:'owner-b',attemptPrefix:'monthly-restart',clock:()=>at})(request(provider)),false,provider+' monthly cap');
  at='2026-11-01T00:00:00.000Z';conversation(f.sqlite,'owner-b',at);
  assert.equal(await guard(f,{owner:'owner-b',attemptPrefix:'next-month',clock:()=>at})(request(provider)),true,provider+' UTC monthly reset');
  assert.equal(f.sqlite.prepare('SELECT SUM(cost_micros) total FROM prospecting_costs').get().total,0);f.sqlite.close();
 }
 // A simulation cannot open the free Meta service window; only actual inbound state can.
 {
  const f=fixture(),store=new RuntimeStore(f.db),before=financial(f.sqlite);
  await store.configureAccount('owner-a',{account:'fixture-meta',dryRun:true,killSwitch:false},now);
  await store.ingestInbox('owner-a',{eventId:'fixture-simulation',recipient:phone,kind:'message',payload:{at:now,text:'Simulação'}},now);
  assert.equal(await guard(f)(request('meta_whatsapp')),false);
  assert.equal((await store.conversation('owner-a',phone)).lastInbound,null);
  const account=await store.account('owner-a');
  await store.configureAccount('owner-a',{account:account.account,revision:account.revision,dryRun:false},now);
  await store.ingestInbox('owner-a',{eventId:'fixture-unverified',recipient:phone,kind:'message',payload:{at:now,text:'Origem não verificada'},sourceMode:'unverified',simulated:false},now);
  assert.equal(await guard(f)(request('meta_whatsapp')),false);
  await store.ingestInbox('owner-a',{eventId:'fixture-real',recipient:phone,kind:'message',payload:{at:now,text:'Entrada verificada fictícia'},sourceMode:'real',simulated:false},now);
  assert.equal((await store.conversation('owner-a',phone)).lastInbound,now);
  assert.equal(await guard(f)(request('meta_whatsapp')),true);
  assert.equal(financial(f.sqlite),before);f.sqlite.close();
 }
 // The two-minute margin is strict, and templates never enter the zero-cost path.
 const cutoff=Date.parse(now)-86400000+120000;
 assert.equal(freeServiceWindow(new Date(cutoff+1).toISOString(),now),true);
 assert.equal(freeServiceWindow(new Date(cutoff).toISOString(),now),false);
 assert.equal(freeServiceWindow(new Date(Date.parse(now)+1).toISOString(),now),false);
 assert.equal(freeServiceWindow(null,now),false);
 for(const [label,lastInbound,values,extra,expected] of [
  ['current',now,{}, {},true],['inside-margin',new Date(cutoff+1).toISOString(),{}, {},true],
  ['margin-boundary',new Date(cutoff).toISOString(),{}, {},false],
  ['expired','2026-10-22T11:00:00.000Z',{}, {},false],
  ['future','2026-10-23T12:00:00.001Z',{}, {},false],
  ['missing',null,{}, {},false],['paused',now,{paused:1},{},false],['opted-out',now,{opted_out:1},{},false],
  ['template',now,{}, {template:{name:'fixture'}},false],['invalid-recipient',now,{}, {recipient:'invalid'},false],
 ]){
  const f=fixture();conversation(f.sqlite,'owner-a',lastInbound,values);
  assert.equal(await guard(f)({...request('meta_whatsapp'),...extra}),expected,label);
  assert.equal(count(f.sqlite),expected?1:0,label+' consumes no allowance when refused');f.sqlite.close();
 }
 // Revocation after an earlier read is fenced in the same INSERT as the reservation.
 {
  const f=fixture();conversation(f.sqlite,'owner-a');
  assert.equal(freeServiceWindow(f.sqlite.prepare('SELECT last_real_inbound FROM prospecting_conversations').get().last_real_inbound,now),true);
  let changed=false;
  f.hooks.beforeRun=sql=>{if(!changed&&sql.startsWith('INSERT INTO prospecting_costs')){changed=true;f.sqlite.prepare('UPDATE prospecting_conversations SET opted_out=1').run();}};
  assert.equal(await guard(f)(request('meta_whatsapp')),false);assert.equal(changed,true);assert.equal(count(f.sqlite),0);f.sqlite.close();
 }
 // Genuine independent SQLite connections contend for the guard's exact statement.
 const directory=mkdtempSync(join(tmpdir(),'mathbrands-free-quota-')),path=join(directory,'quota.sqlite');
 try{
  const initial=fixture(path);initial.sqlite.exec('PRAGMA journal_mode=WAL');initial.sqlite.close();
  const workers=Array.from({length:4},(_,id)=>new Worker(new URL(import.meta.url),{workerData:{id,path}}));
  const exited=workers.map(worker=>new Promise(resolve=>worker.once('exit',resolve)));
  const ready=workers.map(worker=>new Promise((resolve,reject)=>{worker.once('message',message=>message.ready?resolve():reject(Error('worker did not become ready')));worker.once('error',reject);}));
  await Promise.all(ready);
  const results=workers.map(worker=>new Promise((resolve,reject)=>{worker.once('message',message=>message.error?reject(Error(message.error)):resolve(message.accepted));worker.once('error',reject);worker.postMessage('start');}));
  const accepted=await Promise.all(results);await Promise.all(exited);
  assert.equal(accepted.reduce((sum,n)=>sum+n,0),FREE_PROVIDER_LIMITS.resend.minute,'40 attempts across 4 connections must share a single cap');
  // Reopening the same on-disk ledger preserves the cap after a process restart.
  const reopened=fixture(path,false);assert.equal(count(reopened.sqlite),FREE_PROVIDER_LIMITS.resend.minute);
  assert.equal(await guard(reopened,{owner:'after-restart',attemptPrefix:'after-restart'})(request('resend')),false);
  assert.equal(reopened.sqlite.prepare('SELECT SUM(cost_micros) total FROM prospecting_costs').get().total,0);
  assert.equal(reopened.sqlite.prepare('SELECT COUNT(*) n FROM commercial_payments').get().n,0);reopened.sqlite.close();
 }finally{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('mathbrands-free-quota-'));rmSync(directory,{recursive:true,force:true});}
 console.log('PASS: custo zero obrigatório; cotas globais por minuto/dia/mês; 40 reservas concorrentes em quatro conexões; reinício persistente; janela real com margem, opt-out atômico e templates bloqueados; financeiro intacto; zero rede.');
}
