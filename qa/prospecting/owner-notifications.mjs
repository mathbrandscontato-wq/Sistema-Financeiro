import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {RuntimeStore} from '../../lib/prospecting/runtime-store.mjs';
import {ownerNotificationReadiness,reconcileOwnerNotifications,validateOwnerNotification} from '../../lib/prospecting/owner-notifications.mjs';
import {createCommercialRuntime} from '../../lib/prospecting/orchestrator.mjs';

const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
function prepared(sql,args=[]){return {sql,args,bind(...a){return prepared(sql,a);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}
const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const store=new RuntimeStore(db),owner='fixture-owner',now='2026-10-22T16:00:00.000Z',clock=()=>now,since='2026-10-22T15:00:00.000Z';
const phone='5547999991001',otherPhone='5547999991002';
const config={waQuality:'healthy',ownerNotificationsEnabled:true,ownerNotificationPhone:phone,ownerNotificationVerified:true,ownerNotificationConsentRef:'fixture-internal-optin',ownerNotificationsSince:since,ownerNotificationTemplate:{name:'fixture_owner_deal',language:'pt_BR'},approvedTemplates:['fixture_owner_deal']};
const finance=()=>JSON.stringify(['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments','financial_history'].map(t=>sqlite.prepare('SELECT * FROM '+t+' ORDER BY id').all()));
async function untouched(fn){const before=finance();const r=await fn();assert.equal(finance(),before,'owner notices must never mutate financial/CRM records');return r;}
async function saveConfig(value,extra={}){sqlite.prepare('UPDATE prospecting_accounts SET config=?,revision=revision+1,dry_run=COALESCE(?,dry_run),kill_switch=COALESCE(?,kill_switch) WHERE owner=?').run(JSON.stringify(value),extra.dryRun===undefined?null:+extra.dryRun,extra.killSwitch===undefined?null:+extra.killSwitch,owner);}
const reconcile=()=>untouched(()=>reconcileOwnerNotifications({db,store,owner,clock}));
const gate=row=>untouched(()=>validateOwnerNotification({db,store,owner,row,clock}));
assert.equal((await reconcile()).reason,'account_not_configured');
await store.configureAccount(owner,{account:'fixture-account',dryRun:true,killSwitch:false},now);
assert.equal(ownerNotificationReadiness({},now).status,'disabled');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationVerified:false},now).reason,'owner_notice_consent_required');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationConsentRef:''},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationPhone:'invalid'},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationsSince:'2026-10-22'},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationsSince:'2026-02-31T15:00:00Z'},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationsSince:'2026-10-23T15:00:00Z'},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,approvedTemplates:[]},now).reason,'owner_notice_template_required');
assert.equal(ownerNotificationReadiness({...config,ownerNotificationTemplate:{name:'fixture_owner_deal',language:'pt_BR',parameters:['injected']}},now).status,'blocked');
assert.equal(ownerNotificationReadiness({...config,crmOrigin:'https://evil.example.invalid'},now).status,'blocked');
await saveConfig(config);
function contract(id,{contractOwner=owner,created='2026-10-22T15:30:00.000Z',status='Confirmado manualmente',stage='Fechado',archived=0,active=1,audit=true}={}){
 const client='client-'+id,opp='opp-'+id;
 sqlite.prepare('INSERT INTO commercial_clients(id,owner,identity_key,display_name,email,phone,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(client,contractOwner,client,'PRIVATE COMPANY '+id,'private-client@example.invalid','5547999992000',created,created);
 sqlite.prepare('INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,archived,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(opp,contractOwner,client,'PRIVATE TITLE '+id,stage,archived,created,created);
 sqlite.prepare('INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,status,payment_knowledge,active,created) VALUES(?,?,?,?,?,?,?,?)').run(id,contractOwner,opp,50000,status,'unknown',active,created);
 if(audit)sqlite.prepare('INSERT INTO financial_history(id,owner,contract_id,action,data,created) VALUES(?,?,?,?,?,?)').run('confirmation-'+id,contractOwner,id,'Contratação confirmada manualmente',JSON.stringify({action:'contract_create'}),created);
}
contract('eligible');contract('old',{created:'2026-10-22T14:59:59Z'});contract('boundary',{created:since});contract('imported',{status:'Confirmado na planilha'});contract('missing-audit',{audit:false});contract('not-closed',{stage:'Negociação'});contract('archived',{archived:1});contract('cancelled',{active:0});contract('future',{created:'2026-10-23T15:30:00Z'});contract('other-owner',{contractOwner:'other-owner'});
contract('malformed-audit');sqlite.prepare("UPDATE financial_history SET data='invalid json' WHERE contract_id='malformed-audit'").run();
contract('wrong-audit-action');sqlite.prepare("UPDATE financial_history SET data=? WHERE contract_id='wrong-audit-action'").run(JSON.stringify({action:'payment_record'}));
let result=await reconcile();assert.equal(result.queued,1);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM prospecting_outbox').get().n,1);
let row=await store.outbox(owner,'owner-deal:eligible');assert.equal(row.recipient,phone);assert.equal(row.source_mode,'simulation');assert.equal(row.simulated,1);
assert.equal(row.payload.template.parameters[0],'eligible');assert.equal(row.payload.template.parameters[1],'https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site/?opportunity=opp-eligible');
assert.doesNotMatch(JSON.stringify(row.payload),/PRIVATE COMPANY|PRIVATE TITLE|private-client|5547999992000/);
assert.equal((await reconcile()).queued,0);assert.equal((await gate(row)).allowed,true);
assert.equal((await gate({...row,recipient:otherPhone})).reason,'owner_notice_target_invalid');
assert.equal((await gate({...row,owner:'other-owner'})).allowed,false);
assert.equal((await gate({...row,payload:{...row.payload,text:'Comprovante confirma pagamento'}})).reason,'owner_notice_content_changed');
assert.equal((await gate({...row,payload:{...row.payload,template:{...row.payload.template,parameters:['evil','https://evil.example.invalid']}}})).allowed,false);
sqlite.prepare("UPDATE commercial_contracts SET active=0 WHERE id='eligible'").run();assert.equal((await gate(row)).reason,'owner_notice_confirmation_invalid');
sqlite.prepare("UPDATE commercial_contracts SET active=1 WHERE id='eligible'").run();sqlite.prepare("UPDATE commercial_opportunities SET stage='Recusado' WHERE id='opp-eligible'").run();assert.equal((await gate(row)).allowed,false);
sqlite.prepare("UPDATE commercial_opportunities SET stage='Fechado' WHERE id='opp-eligible'").run();
await saveConfig({...config,ownerNotificationVerified:false});assert.equal((await gate(row)).allowed,false);assert.equal((await reconcile()).status,'blocked');
await saveConfig({...config,ownerNotificationPhone:otherPhone});assert.equal((await gate(row)).reason,'owner_notice_target_invalid');
await saveConfig({...config,ownerNotificationConsentRef:'new-fixture-consent'});assert.equal((await gate(row)).reason,'owner_notice_content_changed');
await saveConfig(config,{killSwitch:true});assert.equal((await gate(row)).reason,'kill_switch');assert.equal((await reconcile()).reason,'kill_switch');
await saveConfig(config,{killSwitch:false,dryRun:false});assert.equal((await gate(row)).reason,'owner_notice_simulation_not_promoted');
contract('new-live',{created:'2026-10-22T15:45:00Z'});result=await reconcile();assert.equal(result.queued,1);
const liveRow=await store.outbox(owner,'owner-deal:new-live');assert.equal(liveRow.source_mode,'real');assert.equal(liveRow.simulated,0);assert.equal((await gate(liveRow)).allowed,true);
contract('concurrent',{created:'2026-10-22T15:50:00Z'});const concurrent=await Promise.all([reconcile(),reconcile()]);assert.equal(concurrent.reduce((n,r)=>n+r.queued,0),1);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM prospecting_outbox WHERE key='owner-deal:concurrent'").get().n,1);
await store.takeover(owner,phone,owner,now);assert.equal((await gate(liveRow)).reason,'owner_notice_conversation_blocked');
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM commercial_payments').get().n,0);
// The actual runtime uses the dedicated internal template policy, with no buyer window or outreach quota.
await store.resume(owner,phone,owner,now);
const current=await store.account(owner);
await assert.rejects(()=>store.configureAccount(owner,{account:current.account,revision:current.revision,config:{...config,commercialPhone:phone}},now),/notification_phone_must_differ/);
await store.configureAccount(owner,{account:current.account,revision:current.revision,dryRun:true,config},now);
const freeConfig={...config,costPolicy:'free_only',budgets:{limitMicros:0,estimates:{}},ownerNotificationTemplate:undefined,approvedTemplates:[]};
await saveConfig(freeConfig);
assert.equal(ownerNotificationReadiness(freeConfig,now).status,'ready');
let providerCalls=0;
const transport={send:async message=>{providerCalls++;assert.equal(message.recipient,phone);assert.equal(message.template,undefined);return {status:'accepted',providerId:'owner-notice-'+providerCalls};}};
const beforeSend=async({row})=>(await validateOwnerNotification({db,store,owner,row,clock})).allowed;
const runtime=createCommercialRuntime({db,owner,clock,whatsapp:transport,liveNetworkApproved:true,beforeSend});
contract('integrated-dry',{created:'2026-10-22T15:55:00Z'});
const dryResult=await untouched(()=>runtime.flushOutbox({limit:50}));assert.equal(dryResult.simulated,1);assert.equal(providerCalls,0);
await saveConfig(freeConfig,{dryRun:false});contract('integrated-live',{created:'2026-10-22T15:56:00Z'});
const outside=await untouched(()=>runtime.flushOutbox({limit:50}));assert.equal(outside.sent,0);assert.equal(providerCalls,0);
const pendingFree=await store.outbox(owner,'owner-deal:integrated-live');assert.equal(pendingFree.state,'pending');assert.equal(pendingFree.attempts,0);assert.equal((await gate(pendingFree)).reason,'owner_notice_free_window_required');
sqlite.prepare('UPDATE prospecting_conversations SET last_real_inbound=? WHERE owner=? AND recipient=?').run(now,owner,phone);
const liveResult=await untouched(()=>runtime.flushOutbox({limit:50}));assert.equal(liveResult.sent,1);assert.equal(providerCalls,1);
assert.equal((await store.outbox(owner,'owner-deal:integrated-dry')).state,'simulated');assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM prospecting_outreach').get().n,0);
contract('revoke-before-send',{created:'2026-10-22T15:57:00Z'});
const interrupted=createCommercialRuntime({db,owner,clock,whatsapp:transport,liveNetworkApproved:true,beforeSend:async({row})=>{await saveConfig({...freeConfig,ownerNotificationsEnabled:false});return beforeSend({row});}});
await untouched(()=>interrupted.flushOutbox({limit:50}));assert.equal(providerCalls,1);assert.equal((await store.outbox(owner,'owner-deal:revoke-before-send')).attempts,0);
const crmCount=sqlite.prepare('SELECT COUNT(*) n FROM commercial_clients').get().n;
await runtime.receiveNormalizedEvents([{kind:'inbound',accountId:current.account,eventId:'owner-not-a-buyer',recipient:phone,at:now,text:'Quero contratar'}]);
await runtime.processInbox({limit:50});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM commercial_clients').get().n,crmCount);
// A backlog of ten actual owner notices awaiting a free window must not prevent
// a newer owner e-mail from being delivered by a one-item batch.
const backlogOwner='free-backlog-owner',backlogAccount='free-backlog-account',backlogAt='2026-10-22T16:00:01.000Z';let backlogEmails=0,backlogWhatsApp=0;
await store.configureAccount(backlogOwner,{account:backlogAccount,dryRun:false,killSwitch:false,config:{...freeConfig,ownerEmail:'backlog-owner@example.invalid',ownerEmailVerified:true}},now);
for(let i=0;i<10;i++)contract('free-backlog-'+i,{contractOwner:backlogOwner});
assert.equal((await untouched(()=>reconcileOwnerNotifications({db,store,owner:backlogOwner,clock}))).queued,10);
await store.enqueueOutbox(backlogOwner,{key:'newer-owner-email',recipient:'backlog-owner@example.invalid',channel:'email',sourceMode:'real',simulated:false,payload:{subject:'Aviso fictício',text:'Este envio existe somente no teste local.'}},backlogAt);
const backlogRuntime=createCommercialRuntime({db,owner:backlogOwner,clock:()=>backlogAt,liveNetworkApproved:true,whatsapp:{async send(message){backlogWhatsApp++;assert.equal(message.template,undefined);return {status:'accepted',providerId:'backlog-wa-'+backlogWhatsApp};}},email:{async send(){backlogEmails++;return {status:'accepted',providerId:'backlog-mail-'+backlogEmails};}},beforeSend:async({row})=>row.channel==='email'||(await validateOwnerNotification({db,store,owner:backlogOwner,row,clock:()=>backlogAt})).allowed});
assert.equal((await untouched(()=>backlogRuntime.flushOutbox({limit:1}))).sent,1);assert.equal(backlogEmails,1);assert.equal(backlogWhatsApp,0);
for(let i=0;i<10;i++){const waiting=await store.outbox(backlogOwner,'owner-deal:free-backlog-'+i);assert.equal(waiting.state,'pending');assert.equal(waiting.attempts,0);assert.equal(waiting.next_attempt,0);}
await backlogRuntime.receiveNormalizedEvents([{accountId:backlogAccount,kind:'inbound',eventId:'backlog-owner-opened-window',recipient:phone,at:backlogAt,text:'Pode enviar meus avisos'}]);
assert.equal((await untouched(()=>backlogRuntime.flushOutbox({limit:1}))).sent,1);assert.equal(backlogWhatsApp,1);assert.equal(backlogEmails,1);
sqlite.close();console.log('PASS: avisos internos por confirmação manual, histórico excluído, isolamento, opt-in/template, outbox idempotente, revalidação e financeiro intacto; zero rede.');
