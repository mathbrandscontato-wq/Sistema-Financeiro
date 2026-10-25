import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {commercialServices,PRIVATE_CRM_ORIGIN} from '../../lib/prospecting/server.mjs';

// Exercise CRM -> durable handoff -> official Resend adapter -> quota ledger.
// Every identity, credential and HTTP response is fictional. No real network.
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
function statement(sql,args=[]){return {sql,args,bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}
const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const owner='handoff-mail-fixture',accountId='10001',recipient='owner@example.invalid';
let instant='2026-10-24T13:30:00.000Z';const clock=()=>instant;
const config={costPolicy:'free_only',budgets:{limitMicros:0,estimates:{}},liveApproved:true,webhookVerified:true,waQuality:'healthy',crmOrigin:PRIVATE_CRM_ORIGIN,ownerEmail:recipient,ownerEmailVerified:false};
const env={DB:db,COMMERCIAL_OWNER:owner,COMMERCIAL_EXTERNAL_APPROVED:'true',COMMERCIAL_ACTIVATION_REFERENCE:'fixture-offline-approval',COMMERCIAL_ENVIRONMENT:'test',META_PHONE_NUMBER_ID:accountId,RESEND_API_KEY:'fictional-not-a-credential',COMMERCIAL_EMAIL_FROM:'automation@example.invalid',RESEND_FREE_PLAN_VERIFIED:'true',COMMERCIAL_FREE_PLAN_REVIEW_THROUGH:'2026-10-29T00:00:00Z'};
const calls=[];let failTransport=false;
const fetchImpl=async(url,options)=>{
 assert.equal(url,'https://api.resend.com/emails','only the e-mail adapter may reach this fixture');
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 const body=JSON.parse(options.body);assert.equal(body.from,env.COMMERCIAL_EMAIL_FROM);assert.deepEqual(body.to,[recipient]);
 assert.match(body.text,/Não confirmado pela automação/);assert.match(body.text,/Assumir atendimento/);assert.match(body.text,/https:\/\/mathbrands-orcamentos\.mthsdoliveira\.chatgpt\.site/);
 assert.ok(options.headers['Idempotency-Key']);calls.push({body,idempotencyKey:options.headers['Idempotency-Key']});
 if(failTransport)throw new Error('fictional transport uncertainty');
 return Response.json({id:'fixture-resend-'+calls.length});
};
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Real network forbidden in handoff acceptance QA');};
try{
 let service=await commercialServices(env,owner,{clock,fetchImpl});const store=service.store;
 await store.configureAccount(owner,{account:accountId,dryRun:true,killSwitch:false,config},clock());
 sqlite.prepare("INSERT INTO site_offers(id,owner,opened,price_cents,deposit_policy) VALUES('mail-fixture-offer',?,'2026-10-24',50000,'contract_deposit')").run(owner);
 const save=async patch=>{const current=await store.account(owner);await store.configureAccount(owner,{account:accountId,revision:current.revision,...patch,config:{...current.config,...patch.config}},clock());service=await commercialServices(env,owner,{clock,fetchImpl});};
 const incoming=async(id,phone)=>{
  const event={kind:'inbound',accountId,eventId:id,recipient:phone,at:clock(),text:'Quero contratar',messageType:'text'};
  assert.equal((await service.runtime.receiveNormalizedEvents([event])).accepted,1);
  assert.equal((await service.runtime.processInbox()).handoffs,1);
  await store.takeover(owner,phone,owner,clock());
  return {event,conversation:await store.conversation(owner,phone)};
 };
 // Old simulated and archived handoffs must not consume a live reconciliation page.
 const simulated=await incoming('old-simulated','5547999990100');
 await save({dryRun:false});
 const archived=await incoming('old-archived','5547999990101');
 sqlite.prepare('UPDATE commercial_opportunities SET archived=1 WHERE owner=? AND id=?').run(owner,archived.conversation.opportunityId);
 const events=[];for(let i=0;i<12;i++){instant=new Date(Date.parse(instant)+1000).toISOString();events.push(await incoming('buyer-'+String(i).padStart(2,'0'),'554799999'+String(200+i).padStart(4,'0')));}
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE channel='email'").get().n,0,'unverified destination never creates e-mail');
 await save({config:{ownerEmailVerified:true}});
 for(let page=0;page<4;page++)assert.equal((await service.runtime.reconcileHandoffs({limit:3})).queued,3,'older handled/invalid handoffs must not starve a newer page');
 assert.equal((await service.runtime.reconcileHandoffs({limit:3})).queued,0);
 assert.equal(await store.outbox(owner,'email:handoff:'+simulated.event.eventId),null);
 assert.equal(await store.outbox(owner,'email:handoff:'+archived.event.eventId),null);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE channel='email'").get().n,12);
 // The official adapter shares the persistent three-per-minute quota. Deferred
 // entries keep zero attempts until a request can actually be made.
 for(let minute=0;minute<4;minute++){
  const flushed=await service.runtime.flushOutbox({limit:50});assert.equal(flushed.sent,3);assert.equal(calls.length,(minute+1)*3);
  for(const row of sqlite.prepare("SELECT attempts FROM prospecting_outbox WHERE channel='email' AND state='pending'").all())assert.equal(row.attempts,0);
  instant=new Date(Date.parse(instant)+61000).toISOString();
 }
 assert.equal(new Set(calls.map(c=>c.idempotencyKey)).size,12);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM prospecting_costs WHERE provider='free:resend' AND cost_micros=0").get().n,12);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE channel='email' AND state='sent'").get().n,12,'accepted by fictional provider, not proof of delivery');
 assert.equal((await service.runtime.flushOutbox({limit:50})).sent,0);assert.equal(calls.length,12);
 assert.equal((await service.runtime.receiveNormalizedEvents([events[0].event])).duplicates,1);
 assert.equal((await service.runtime.reconcileHandoffs({limit:50})).queued,0);
 // A provider timeout is held for review and is never replayed automatically.
 await incoming('uncertain-buyer','5547999990300');failTransport=true;
 assert.equal((await service.runtime.flushOutbox({limit:50})).uncertain,1);
 assert.equal((await store.outbox(owner,'email:handoff:uncertain-buyer')).state,'uncertain');
 await service.runtime.flushOutbox({limit:50});assert.equal(calls.length,13);failTransport=false;
 // Changing the verified destination does not redirect old pending messages.
 await incoming('destination-change','5547999990301');
 await save({config:{ownerEmail:'changed@example.invalid',ownerEmailVerified:false}});
 await service.runtime.flushOutbox({limit:50});assert.equal(calls.length,13);
 assert.equal((await store.outbox(owner,'email:handoff:destination-change')).state,'pending');
 assert.equal((await store.outbox(owner,'email:handoff:destination-change')).recipient,recipient);
 await save({killSwitch:true});assert.equal((await service.runtime.flushOutbox({limit:50})).sent,0);assert.equal(calls.length,13);
 for(const table of ['commercial_contracts','commercial_payments','financial_history'])assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM prospecting_costs WHERE cost_micros>0').get().n,0);
 console.log('PASS: CRM -> fila de e-mail -> adaptador Resend fictício, backlog sem bloqueio, cotas persistentes, idempotência, destino verificado, incerteza sem repetição e financeiro intacto; zero rede real.');
}finally{globalThis.fetch=originalFetch;sqlite.close();}
