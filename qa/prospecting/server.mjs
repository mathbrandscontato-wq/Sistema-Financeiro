import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {RuntimeStore} from '../../lib/prospecting/runtime-store.mjs';
import {receiveWhatsApp,runCommercialJob,commercialServices} from '../../lib/prospecting/server.mjs';
import {createBudgetGuard} from '../../lib/prospecting/budget.mjs';
import {approveClosing,approvedPixMessage,validateOfficialPix} from '../../lib/prospecting/closing.mjs';
import {PROSPECTING_SNAPSHOT_TABLES,prospectingSnapshotQueries} from '../../lib/prospecting/snapshot.mjs';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
function prepared(sql,args=[]){return {sql,args,bind(...a){return prepared(sql,a);},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}
const adapter={prepare:prepared,async batch(st){db.exec('BEGIN');try{const results=[];for(const s of st)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
const now='2026-10-22T13:30:00Z',clock=()=>now,owner='fixture-owner',phone='5547999990000';
const env={DB:adapter,COMMERCIAL_OWNER:owner,META_PHONE_NUMBER_ID:'10001',META_WABA_ID:'20001',META_APP_SECRET:'fixture-app-secret',META_VERIFY_TOKEN:'fixture-verify-token'};
const store=new RuntimeStore(adapter);await store.configureAccount(owner,{account:'10001',dryRun:true,killSwitch:false,config:{waQuality:'healthy',crmOrigin:'https://crm.example.invalid'}},now);
const base='https://crm.example.invalid/api/whatsapp';
assert.equal((await receiveWhatsApp(new Request(base+'?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=42'),env,{clock})).status,403);
assert.equal(await (await receiveWhatsApp(new Request(base+'?hub.mode=subscribe&hub.verify_token=fixture-verify-token&hub.challenge=42'),env,{clock})).text(),'42');
const payload={object:'whatsapp_business_account',entry:[{id:'20001',changes:[{field:'messages',value:{metadata:{phone_number_id:'10001'},messages:[{id:'fixture-message',from:phone,timestamp:String(Date.parse(now)/1000),type:'text',text:{body:'Quero contratar'}}]}}]}]};
const raw=JSON.stringify(payload),sign=async value=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.META_APP_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return 'sha256='+Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))).toString('hex');};
const request=signature=>new Request(base,{method:'POST',headers:{'X-Hub-Signature-256':signature,'Content-Type':'application/json'},body:raw});
assert.equal((await receiveWhatsApp(new Request(base,{method:'POST',body:'x'.repeat(131073)}),env,{clock})).status,413);
assert.equal((await receiveWhatsApp(request('sha256='+'0'.repeat(64)),env,{clock})).status,401);assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_inbox').get().n,0);
let backgroundScheduled=0;const onAccepted=()=>{backgroundScheduled++;};
assert.equal((await receiveWhatsApp(request('sha256='+'0'.repeat(64)),env,{clock,onAccepted})).status,401);assert.equal(backgroundScheduled,0);
const ignoredRaw=JSON.stringify({...payload,entry:[]});assert.equal((await receiveWhatsApp(new Request(base,{method:'POST',headers:{'X-Hub-Signature-256':await sign(ignoredRaw)},body:ignoredRaw}),env,{clock,onAccepted})).status,200);assert.equal(backgroundScheduled,0);
const signature=await sign(raw);assert.equal((await receiveWhatsApp(request(signature),env,{clock,onAccepted})).status,200);assert.equal((await receiveWhatsApp(request(signature),env,{clock,onAccepted})).status,200);assert.equal(backgroundScheduled,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_inbox').get().n,1);
assert.equal((await runCommercialJob(new Request('https://crm.example.invalid/api/commercial-job',{method:'POST'}),env,{})).status,401);
let networkCalls=0;const service=await commercialServices({...env,COMMERCIAL_EXTERNAL_APPROVED:'true'},owner,{clock,fetchImpl:async()=>{networkCalls++;throw Error('No network permitted');}});
await service.runtime.processInbox({limit:10});await service.runtime.flushOutbox({limit:10});assert.equal(networkCalls,0);assert.ok(db.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE state='simulated'").get().n>=1);
const guard=createBudgetGuard({db:adapter,owner,attemptPrefix:'fixture',limitMicros:10,clock});const reserved=await Promise.all(Array.from({length:20},()=>guard({provider:'fixture',costMicros:1})));assert.equal(reserved.filter(Boolean).length,10);assert.equal(await createBudgetGuard({db:adapter,owner,attemptPrefix:'disabled',limitMicros:0,clock})({provider:'fixture',costMicros:1}),false);
// Even compromised nested configuration cannot replace the server-derived owner.
let accountForAttack=await store.account(owner);await assert.rejects(()=>store.configureAccount(owner,{account:accountForAttack.account,revision:accountForAttack.revision,config:{research:{owner:'spoofed-owner'}}},now),/invalid_research_config/);
db.prepare('UPDATE prospecting_accounts SET config=? WHERE owner=?').run(JSON.stringify({waQuality:'healthy',research:{owner:'spoofed-owner',researchEnabled:true,maxQueries:1,maxCostMicros:0,costPerQueryMicros:0,timeoutMs:1000}}),owner);
const job=await runCommercialJob(new Request('https://crm.example.invalid/api/commercial-job',{method:'POST',headers:{Authorization:'Bearer fixture-job'},body:JSON.stringify({scheduledAt:now})}),{...env,COMMERCIAL_JOB_SECRET:'fixture-job',COMMERCIAL_SCHEDULER_ENABLED:'true'},{clock,markets:JSON.parse(readFileSync('data/prospecting-markets.json','utf8'))});assert.equal(job.status,200);assert.equal(db.prepare("SELECT COUNT(*) n FROM prospecting_runs WHERE owner='spoofed-owner'").get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_runs WHERE owner=?').get(owner).n,1);

const convo=await store.conversation(owner,phone);assert.ok(convo.opportunityId,'legitimate inbound created/reused official CRM opportunity');
await assert.rejects(()=>approveClosing(adapter,owner,'not-owner',phone,{},now),/human/);
const account=await store.account(owner);await store.configureAccount(owner,{account:account.account,revision:account.revision,dryRun:false,killSwitch:true,config:{waQuality:'healthy',crmOrigin:'https://crm.example.invalid'}},now);
await service.runtime.receiveNormalizedEvents([{kind:'inbound',accountId:account.account,eventId:'inbound:fixture-acceptance',recipient:phone,at:now,text:'Aceito as condições aprovadas'}]);
await approveClosing(adapter,owner,owner,phone,{capacityApproved:true,acceptanceReviewed:true,approvalRef:'approved-terms-fixture',briefingRef:'briefing-fixture',pixRef:'official-pix-fixture',acceptanceEvent:'inbound:fixture-acceptance'},now);
await assert.rejects(()=>approvedPixMessage(adapter,owner,phone,{}),/pix_gate/);
// Fake, non-routable fixture validates parsing/amount/CRC; never a payment or network call.
const tlv=(tag,value)=>tag+String(value.length).padStart(2,'0')+value;
function fakePix(amount='200.00'){const content=tlv('00','01')+tlv('26',tlv('00','BR.GOV.BCB.PIX')+tlv('01','fixture@example.invalid'))+tlv('53','986')+(amount===null?'':tlv('54',amount))+tlv('58','BR')+tlv('59','FIXTURE QA')+tlv('60','JOINVILLE')+'6304';let crc=65535;for(const b of new TextEncoder().encode(content)){crc^=b<<8;for(let i=0;i<8;i++)crc=crc&32768?((crc<<1)^0x1021)&65535:(crc<<1)&65535;}return content+crc.toString(16).toUpperCase().padStart(4,'0');}
assert.equal(validateOfficialPix(fakePix(),'fixture@example.invalid'),true);assert.throws(()=>validateOfficialPix(fakePix(null),'fixture@example.invalid'));assert.throws(()=>validateOfficialPix(fakePix('150.00'),'fixture@example.invalid'));
const pix=await approvedPixMessage(adapter,owner,phone,{COMMERCIAL_PIX_VALIDATED:'true',COMMERCIAL_PIX_REFERENCE:'official-pix-fixture',COMMERCIAL_PIX_PAYLOAD:fakePix(),COMMERCIAL_PIX_KEY:'fixture@example.invalid'});assert.match(pix.text,/R\$ 200/);
db.prepare('UPDATE commercial_opportunities SET archived=1 WHERE owner=? AND id=?').run(owner,convo.opportunityId);
await assert.rejects(()=>approvedPixMessage(adapter,owner,phone,{COMMERCIAL_PIX_VALIDATED:'true',COMMERCIAL_PIX_REFERENCE:'official-pix-fixture',COMMERCIAL_PIX_PAYLOAD:fakePix(),COMMERCIAL_PIX_KEY:'fixture@example.invalid'}),/pix_gate/);
db.prepare('UPDATE commercial_opportunities SET archived=0 WHERE owner=? AND id=?').run(owner,convo.opportunityId);

await store.optOut(owner,phone,now);await assert.rejects(()=>approvedPixMessage(adapter,owner,phone,{COMMERCIAL_PIX_VALIDATED:'true',COMMERCIAL_PIX_REFERENCE:'official-pix-fixture',COMMERCIAL_PIX_PAYLOAD:fakePix(),COMMERCIAL_PIX_KEY:'fixture@example.invalid'}),/pix_gate/);
assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_payments').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM commercial_contracts').get().n,0);

// The existing protection export includes operational evidence and the owner's quota only.
await store.configureAccount('other-owner',{account:'other-account'},now);
db.prepare("INSERT INTO prospecting_outreach(account,local_day,recipient,attempt_key,created) VALUES(?,?,?,?,?)").run('10001','2026-10-22',phone,'owner-attempt',now);
db.prepare("INSERT INTO prospecting_outreach(account,local_day,recipient,attempt_key,created) VALUES(?,?,?,?,?)").run('other-account','2026-10-22',phone,'other-attempt',now);
const backup=Object.fromEntries(await Promise.all(prospectingSnapshotQueries(adapter,owner).map(async(q,i)=>[PROSPECTING_SNAPSHOT_TABLES[i],(await q.all()).results])));
assert.equal(backup.prospecting_accounts.length,1);assert.equal(backup.prospecting_accounts[0].owner,owner);
assert.equal(backup.prospecting_outreach.length,1);assert.equal(backup.prospecting_outreach[0].attempt_key,'owner-attempt');
assert.ok(backup.prospecting_inbox.length>0&&backup.prospecting_consents.length>0&&backup.prospecting_approvals.length>0);

// Legacy paid configuration cannot activate the deployed runtime or consume old keys.
db.prepare("INSERT INTO site_offers(id,owner,opened,price_cents,deposit_policy) VALUES('fixture-offer',?,'2026-10-22',50000,'contract_deposit')").run(owner);
let liveAccount=await store.account(owner);
const paidConfig={liveApproved:true,webhookVerified:true,waQuality:'healthy',budgets:{limitMicros:100,estimates:{google_places:1}}};
db.prepare('UPDATE prospecting_accounts SET config=?,dry_run=0,kill_switch=0 WHERE owner=?').run(JSON.stringify(paidConfig),owner);
const paidService=await commercialServices({...env,COMMERCIAL_EXTERNAL_APPROVED:'true',OPENAI_API_KEY:'unused-fixture',GOOGLE_PLACES_API_KEY:'unused-fixture'},owner,{clock,fetchImpl:async()=>{throw Error('paid network forbidden');}});
assert.equal(paidService.readiness.effectiveExternalEnabled,false);
await assert.rejects(()=>paidService.researchProvider().search('consultoria Joinville'),/provider_disabled/);
liveAccount=await store.account(owner);
const liveConfig={costPolicy:'free_only',liveApproved:true,webhookVerified:true,waQuality:'healthy',budgets:{limitMicros:0,estimates:{}}};
await store.configureAccount(owner,{account:liveAccount.account,revision:liveAccount.revision,dryRun:false,killSwitch:false,config:liveConfig},now);
const mockLiveEnv={...env,COMMERCIAL_EXTERNAL_APPROVED:'true',COMMERCIAL_ACTIVATION_REFERENCE:'fixture-approval',TAVILY_API_KEY:'fixture-not-a-secret',TAVILY_FREE_PLAN_VERIFIED:'true',TAVILY_COMMERCIAL_USE_APPROVED:'true',TAVILY_COMMERCIAL_USE_APPROVAL_REFERENCE:'fixture-terms-review',COMMERCIAL_FREE_PLAN_REVIEW_THROUGH:'2026-11-01T00:00:00Z'};
let mockCalls=0;const mockFetch=async(url,options)=>{mockCalls++;assert.equal(url,'https://api.tavily.com/search');const body=JSON.parse(options.body);assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);return Response.json({results:[],usage:{credits:1}});};
const termsBlockedService=await commercialServices({...mockLiveEnv,TAVILY_COMMERCIAL_USE_APPROVED:'false'},owner,{clock,fetchImpl:mockFetch});
assert.equal(termsBlockedService.readiness.research,false);
await assert.rejects(()=>termsBlockedService.researchProvider().search('consultoria Joinville'),/tavily_use_case_review_required/);
assert.equal(mockCalls,0,'terms review gate cannot reserve or transmit');
const liveService=await commercialServices(mockLiveEnv,owner,{clock,fetchImpl:mockFetch});assert.equal(liveService.readiness.effectiveExternalEnabled,true);
await liveService.researchProvider().search('consultoria Joinville');assert.equal(mockCalls,1);
liveAccount=await store.account(owner);await store.configureAccount(owner,{account:liveAccount.account,revision:liveAccount.revision,config:{...liveConfig,liveApproved:false}},now);
await assert.rejects(()=>liveService.researchProvider().search('consultoria Joinville'),/provider_free_quota_exhausted/);assert.equal(mockCalls,1);
liveAccount=await store.account(owner);await store.configureAccount(owner,{account:liveAccount.account,revision:liveAccount.revision,config:liveConfig},now);
const beforeOfferChange=await commercialServices(mockLiveEnv,owner,{clock,fetchImpl:mockFetch});db.prepare("UPDATE site_offers SET price_cents=30000 WHERE id='fixture-offer'").run();
await assert.rejects(()=>beforeOfferChange.researchProvider().search('consultoria Joinville'),/provider_free_quota_exhausted/);assert.equal(mockCalls,1);
db.prepare("UPDATE site_offers SET price_cents=50000 WHERE id='fixture-offer'").run();
const expiredService=await commercialServices({...mockLiveEnv,COMMERCIAL_FREE_PLAN_REVIEW_THROUGH:'2026-10-21T00:00:00Z'},owner,{clock,fetchImpl:mockFetch});
assert.equal(expiredService.readiness.research,false);await assert.rejects(()=>expiredService.researchProvider().search('consultoria Joinville'),/provider_free_plan_unverified/);assert.equal(mockCalls,1);
// An unexpected provider credit debit persists the kill switch, invalidating all adapters.
const mismatch=await commercialServices(mockLiveEnv,owner,{clock,fetchImpl:async()=>Response.json({results:[],usage:{credits:2}})});
await assert.rejects(()=>mismatch.researchProvider().search('consultoria Joinville'),/tavily_credit_mismatch/);
assert.equal((await store.account(owner)).killSwitch,true);
await assert.rejects(()=>mismatch.researchProvider().search('consultoria Joinville'),/provider_free_quota_exhausted/);
assert.equal(db.prepare('SELECT COUNT(*) n FROM prospecting_costs WHERE cost_micros>0 AND provider LIKE ?').get('free:%').n,0);
db.close();console.log('PASS: webhook HMAC e replay, job autenticado, simulação sem rede, orçamento atômico, handoff CRM e Pix condicionado sem pagamentos.');
