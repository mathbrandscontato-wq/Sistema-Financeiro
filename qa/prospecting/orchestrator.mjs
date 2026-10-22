import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createCommercialRuntime} from '../../lib/prospecting/orchestrator.mjs';
import {consult} from '../../lib/prospecting/policy.mjs';

const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync(new URL('../../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../../drizzle/'+f,import.meta.url),'utf8'));
function statement(sql,args=[]){return {sql,args,bind(...values){return statement(sql,values);},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};}};}
const adapter={prepare:statement,async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
const owner='owner',account='fixture-business',phone='5547999990000';let time='2026-10-22T13:30:00Z',snapshots=0,waCalls=[],emailCalls=[],agentCalls=0;
const clock=()=>time,whatsapp={async send(input){waCalls.push(input);return {status:'accepted',providerId:'mock-wa-'+waCalls.length};}},email={async send(input){emailCalls.push(input);return {status:'accepted',providerId:'mock-email-'+emailCalls.length};}};
const beforeWrite=async()=>{snapshots++;};
const runtime=createCommercialRuntime({db:adapter,owner,clock,whatsapp,email,beforeWrite,agent:{async respond(){agentCalls++;throw Error('must not run without network gate');}}});
const store=runtime.store;
const financial=()=>JSON.stringify(['commercial_contracts','commercial_payments','financial_history'].map(t=>db.prepare('SELECT * FROM '+t).all()));
const financialBefore=financial();
await store.configureAccount(owner,{account},time);
const event=(id,text,recipient=phone,at=time)=>({accountId:account,kind:'inbound',eventId:id,recipient,at,text,messageType:'text',providerId:'incoming-'+id});
assert.equal((await runtime.receiveNormalizedEvents([{...event('wrong','Oi'),accountId:'unrelated'}])).ignored,1);
await runtime.receiveNormalizedEvents([event('hello','Oi')]);assert.equal((await runtime.processInbox()).blocked,1);
assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_clients').get().n,0);
let settings=await store.account(owner);
await store.configureAccount(owner,{account,revision:settings.revision,killSwitch:false,config:{waQuality:'healthy'}},time);
assert.equal((await runtime.processInbox()).replies,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_opportunities').get().n,0);
assert.equal((await runtime.flushOutbox()).simulated,1);assert.equal((await store.outbox(owner,'reply:hello')).state,'simulated');assert.equal(agentCalls,0);assert.equal(waCalls.length,0);
await runtime.receiveNormalizedEvents([event('interest','Quero contratar')]);const interest=await runtime.processInbox();assert.equal(interest.handoffs,1);assert.equal(interest.replies,1);
assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_clients').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_opportunities').get().n,1);
assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_handoffs').get().n,1);assert.ok(snapshots>=2);
assert.equal(db.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE channel='email'").get().n,0);
await runtime.flushOutbox();settings=await store.account(owner);
await store.configureAccount(owner,{account,revision:settings.revision,config:{...settings.config,ownerEmail:'owner@example.invalid',ownerEmailVerified:true,crmOrigin:'https://crm.example.invalid'}},time);
assert.equal((await runtime.flushOutbox()).simulated,1);assert.equal((await store.outbox(owner,'email:handoff:interest')).state,'simulated');assert.equal(emailCalls.length,0);
assert.equal((await runtime.receiveNormalizedEvents([event('interest','Quero contratar')])).duplicates,1);assert.equal((await runtime.processInbox()).processed,0);
assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_opportunities').get().n,1);assert.equal(financial(),financialBefore);

// Simulated pending events and outbox cannot become real after changing account mode.
await runtime.receiveNormalizedEvents([event('sim-pending','Oi','5547999990088')]);
await store.enqueueOutbox(owner,{key:'sim-pending-output',recipient:phone,channel:'whatsapp',payload:{text:consult('Oi').reply}},time);

// Without explicit network authorization, live-configured accounts still cannot call an adapter.
settings=await store.account(owner);await store.configureAccount(owner,{account,revision:settings.revision,dryRun:false},time);
await runtime.receiveNormalizedEvents([event('price-gate','Qual o preço?')]);await runtime.processInbox();assert.ok((await runtime.flushOutbox()).blocked>0);assert.equal(waCalls.length,0);assert.equal(agentCalls,0);
const live=createCommercialRuntime({db:adapter,owner,clock,whatsapp,email,beforeWrite,liveNetworkApproved:true});
assert.equal((await live.flushOutbox()).sent,1);assert.equal((await store.outbox(owner,'sim-pending-output')).state,'pending');assert.equal((await store.inbox(owner,'sim-pending')).state,'pending');assert.equal(waCalls.length,1);assert.equal((await store.outbox(owner,'reply:price-gate')).state,'sent');
const accepted=await store.outbox(owner,'reply:price-gate');assert.equal(accepted.provider_id,'mock-wa-1');
const statuses=await live.receiveNormalizedEvents([{accountId:account,kind:'status',eventId:'status:delivered',providerId:'mock-wa-1',status:'delivered',at:time},{accountId:account,kind:'status',eventId:'status:unknown',providerId:'unknown-provider-message',status:'read',at:time}]);assert.equal(statuses.accepted,1);assert.equal(statuses.ignored,1);
await live.processInbox();assert.equal((await store.outbox(owner,'reply:price-gate')).state,'sent');assert.equal(db.prepare("SELECT COUNT(*) n FROM commercial_history WHERE action='Atualização de entrega do WhatsApp'").get().n,1);

// Generated promises are never sent; the handoff uses the existing opportunity.
const unsafe=createCommercialRuntime({db:adapter,owner,clock,whatsapp,email,beforeWrite,liveNetworkApproved:true,agent:{async respond(){return {mode:'model',event:'discovery',reply:'Inclui 10 páginas, checkout e integração por R$500.',evidenceIds:[]};}}});
await unsafe.receiveNormalizedEvents([event('unsafe','Gostaria de saber mais')]);const guarded=await unsafe.processInbox();assert.equal(guarded.handoffs,1);assert.equal(guarded.replies,0);assert.equal(await store.outbox(owner,'reply:unsafe'),null);
await unsafe.flushOutbox();assert.equal(waCalls.length,1);assert.equal(emailCalls.length,1);assert.equal(emailCalls[0].to,'owner@example.invalid');assert.ok(emailCalls[0].text.includes(phone));assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_opportunities').get().n,1);
await store.enqueueOutbox(owner,{sourceMode:'real',simulated:false,key:'unsafe-manual',recipient:phone,channel:'whatsapp',payload:{text:'Garantimos uma loja por R$500'}},time);await live.flushOutbox();assert.equal((await store.outbox(owner,'unsafe-manual')).state,'pending');

// A stale webhook cannot reopen the service window.
const stale='5547999990001';await live.receiveNormalizedEvents([event('stale','Qual o preço?',stale,'2026-10-20T13:30:00Z')]);const staleResult=await live.processInbox();assert.equal(staleResult.replies,0);assert.equal(await store.outbox(owner,'reply:stale'),null);

// Pix requires an explicit final gate. It never uses a screenshot as confirmation.
await store.enqueueOutbox(owner,{sourceMode:'real',simulated:false,key:'pix-test',recipient:phone,channel:'whatsapp',payload:{kind:'approved_pix',text:'Dados fictícios de Pix para homologação',approvalRef:'qa-approval'}},time);await live.flushOutbox();assert.equal((await store.outbox(owner,'pix-test')).state,'pending');
const deniedPix=createCommercialRuntime({db:adapter,owner,clock,whatsapp,email,beforeWrite,liveNetworkApproved:true,beforeSend:async({row})=>row.payload.kind!=='approved_pix'});await deniedPix.flushOutbox();assert.equal((await store.outbox(owner,'pix-test')).state,'dlq');assert.equal(waCalls.length,1);

// Network uncertainty is terminal for automatic retries.
await store.enqueueOutbox(owner,{sourceMode:'real',simulated:false,key:'uncertain',recipient:phone,channel:'whatsapp',payload:{kind:'text_reply',source:'policy',event:'conditions',text:consult('Qual o preço?').reply}},time);
let attempts=0;const uncertain=createCommercialRuntime({db:adapter,owner,clock,beforeWrite,liveNetworkApproved:true,whatsapp:{async send(){attempts++;throw Object.assign(new Error('provider_transport_error'),{uncertain:true});}},email});
await uncertain.flushOutbox();assert.equal((await store.outbox(owner,'uncertain')).state,'uncertain');await uncertain.flushOutbox();assert.equal(attempts,1);

// The first-outreach quota is global to the configured account and is not consumed by replies.
settings=await store.account(owner);await store.configureAccount(owner,{account,revision:settings.revision,config:{...settings.config,calendar:{reviewedThrough:'2026-12-31',holidays:[]},approvedTemplates:['mathbrands_intro']}},time);
for(let i=0;i<11;i++){const recipient='554799998'+String(i).padStart(4,'0');await store.ensureConversation(owner,recipient,{},time);await store.setConsent(owner,recipient,{channel:'whatsapp',brand:'Math Brands',purpose:'sites',evidence:'Aceite fictício de QA',grantedAt:'2026-10-22T12:00:00Z'},time);await store.enqueueOutbox(owner,{sourceMode:'real',simulated:false,key:'proactive-'+i,recipient,channel:'whatsapp',payload:{proactive:true,template:{approved:true,name:'mathbrands_intro',language:'pt_BR'}}},time);}
const quota=await live.flushOutbox({limit:30});assert.equal(quota.sent,10);assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_outreach').get().n,10);assert.equal(waCalls.filter(r=>r.template).length,10);

// An accepted receipt arriving after human takeover is retained without enabling retry.
const latePhone='5547999990077';await live.receiveNormalizedEvents([event('late-receipt','Qual o preço?',latePhone)]);await live.processInbox();
const lateRuntime=createCommercialRuntime({db:adapter,owner,clock,beforeWrite,liveNetworkApproved:true,email,whatsapp:{async send(){await store.takeover(owner,latePhone,'owner',time);return {status:'accepted',providerId:'accepted-after-human'};}}});
await lateRuntime.flushOutbox({limit:30});assert.equal((await store.outbox(owner,'reply:late-receipt')).state,'uncertain');assert.equal((await store.outbox(owner,'reply:late-receipt')).provider_id,'accepted-after-human');

// Human takeover wins over previously queued messages, and repeated echo delivery does not undo resume.
await live.receiveNormalizedEvents([{accountId:account,kind:'human_echo',eventId:'human-1',recipient:phone,providerId:'echo-1',at:time}]);assert.equal((await store.conversation(owner,phone)).paused,true);assert.equal((await store.outbox(owner,'unsafe-manual')).state,'cancelled');
await store.resume(owner,phone,'owner',time);await live.receiveNormalizedEvents([{accountId:account,kind:'human_echo',eventId:'human-1',recipient:phone,providerId:'echo-1',at:time}]);assert.equal((await store.conversation(owner,phone)).paused,false);
await live.receiveNormalizedEvents([event('optout','Não quero mensagens')]);await live.processInbox();assert.equal((await store.conversation(owner,phone)).optedOut,true);
settings=await store.account(owner);await store.configureAccount(owner,{account,revision:settings.revision,killSwitch:true},time);await live.receiveNormalizedEvents([event('kill','Oi','5547999990099')]);assert.ok((await live.processInbox()).blocked>0);

// Conversation contention is waiting, not a processing failure or an external send attempt.
const concurrentOwner='concurrency-owner',concurrentAccount='concurrency-account',concurrentPhone='5547999990066';let concurrentCalls=0,activeSends=0,maxActiveSends=0,firstStarted,releaseFirst;
const firstStartedPromise=new Promise(resolve=>{firstStarted=resolve;}),firstReleasePromise=new Promise(resolve=>{releaseFirst=resolve;});
const concurrentProvider={async send(){const number=++concurrentCalls;activeSends++;maxActiveSends=Math.max(maxActiveSends,activeSends);try{if(number===1){firstStarted();await firstReleasePromise;}return {status:'accepted',providerId:'serialized-'+number};}finally{activeSends--;}}};
const concurrent=createCommercialRuntime({db:adapter,owner:concurrentOwner,clock,whatsapp:concurrentProvider,liveNetworkApproved:true});
const concurrentStore=concurrent.store;
await concurrentStore.configureAccount(concurrentOwner,{account:concurrentAccount,killSwitch:false,config:{waQuality:'healthy'}},time);
const concurrentEvent=id=>({accountId:concurrentAccount,kind:'inbound',eventId:id,recipient:concurrentPhone,at:time,text:'Qual o preço?',messageType:'text'});
await concurrent.receiveNormalizedEvents([concurrentEvent('busy-inbound')]);assert.equal(await concurrentStore.claimConversation(concurrentOwner,concurrentPhone,'other-processor',time),true);
for(let i=0;i<8;i++){const waiting=await concurrent.processInbox();assert.equal(waiting.blocked,1);assert.equal(waiting.failed,0);const inbox=await concurrentStore.inbox(concurrentOwner,'busy-inbound');assert.equal(inbox.state,'pending');assert.equal(inbox.attempts,0);}
await concurrentStore.releaseConversation(concurrentOwner,concurrentPhone,'other-processor');assert.equal((await concurrent.processInbox()).replies,1);assert.equal((await concurrentStore.inbox(concurrentOwner,'busy-inbound')).state,'complete');assert.equal((await concurrentStore.inbox(concurrentOwner,'busy-inbound')).attempts,1);await concurrent.flushOutbox();assert.equal(concurrentCalls,0);
let concurrentSettings=await concurrentStore.account(concurrentOwner);await concurrentStore.configureAccount(concurrentOwner,{account:concurrentAccount,revision:concurrentSettings.revision,dryRun:false},time);
await concurrent.receiveNormalizedEvents([concurrentEvent('real-service-window')]);
for(const key of ['serialized-a','serialized-b'])await concurrentStore.enqueueOutbox(concurrentOwner,{key,sourceMode:'real',simulated:false,recipient:concurrentPhone,channel:'whatsapp',payload:{text:consult('Qual o preço?').reply}},time);
await concurrentStore.claimConversation(concurrentOwner,concurrentPhone,'other-processor',time);
for(let i=0;i<5;i++){const waiting=await concurrent.flushOutbox();assert.equal(waiting.uncertain,0);assert.equal(waiting.failed,0);assert.equal(waiting.blocked,2);for(const key of ['serialized-a','serialized-b']){const out=await concurrentStore.outbox(concurrentOwner,key);assert.equal(out.state,'pending');assert.equal(out.attempts,0);}}
await concurrentStore.releaseConversation(concurrentOwner,concurrentPhone,'other-processor');
const runningFlush=concurrent.flushOutbox({limit:1});await firstStartedPromise;
try{const competingFlush=await concurrent.flushOutbox();assert.equal(competingFlush.blocked,1);assert.equal(competingFlush.uncertain,0);assert.equal(competingFlush.failed,0);assert.equal(concurrentCalls,1);assert.equal((await concurrentStore.outbox(concurrentOwner,'serialized-b')).attempts,0);assert.equal((await concurrentStore.outbox(concurrentOwner,'serialized-b')).state,'pending');}finally{releaseFirst();}
await runningFlush;await Promise.all([concurrent.flushOutbox(),concurrent.flushOutbox()]);assert.equal(concurrentCalls,2);assert.equal(maxActiveSends,1);for(const key of ['serialized-a','serialized-b']){const out=await concurrentStore.outbox(concurrentOwner,key);assert.equal(out.state,'sent');assert.equal(out.attempts,1);}

// Human takeover while the final gate is running cancels preparation before the provider.
await concurrentStore.enqueueOutbox(concurrentOwner,{key:'takeover-before-provider',sourceMode:'real',simulated:false,recipient:concurrentPhone,channel:'whatsapp',payload:{text:consult('Qual o preço?').reply}},time);
const takeoverBeforeProvider=createCommercialRuntime({db:adapter,owner:concurrentOwner,clock,whatsapp:concurrentProvider,liveNetworkApproved:true,beforeSend:async()=>{await concurrentStore.takeover(concurrentOwner,concurrentPhone,concurrentOwner,time);return true;}});
const stopped=await takeoverBeforeProvider.flushOutbox();assert.equal(stopped.uncertain,0);assert.equal(concurrentCalls,2);const cancelledPreparation=await concurrentStore.outbox(concurrentOwner,'takeover-before-provider');assert.equal(cancelledPreparation.state,'cancelled');assert.equal(cancelledPreparation.attempts,0);assert.equal((await concurrentStore.conversation(concurrentOwner,concurrentPhone)).paused,true);
await concurrentStore.resume(concurrentOwner,concurrentPhone,concurrentOwner,time);
await concurrentStore.enqueueOutbox(concurrentOwner,{key:'preflight-error',sourceMode:'real',simulated:false,recipient:concurrentPhone,channel:'whatsapp',payload:{text:consult('Qual o preço?').reply}},time);
const preflightError=createCommercialRuntime({db:adapter,owner:concurrentOwner,clock,whatsapp:concurrentProvider,liveNetworkApproved:true,beforeSend:async()=>{throw Object.assign(new Error('approval_temporarily_unavailable'),{uncertain:true,retryable:true});}});
assert.equal((await preflightError.flushOutbox()).uncertain,0);assert.equal(concurrentCalls,2);assert.equal((await concurrentStore.outbox(concurrentOwner,'preflight-error')).state,'failed');assert.equal((await concurrentStore.outbox(concurrentOwner,'preflight-error')).attempts,0);
assert.equal(financial(),financialBefore);db.close();console.log('PASS: jornada integrada com mocks, CRM reaproveitado, handoff/e-mail pendentes, dry-run separado, janela original, guard de escopo, Pix bloqueado, timeout sem replay, cota global 10, takeover e financeiro intacto.');
