import {normalizeRecipient} from './policy.mjs';

const text=(value,max=200)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('invalid_text');return value.trim();};
const code=value=>{if(value==null)return null;if(typeof value!=='string'||!/^[a-z0-9_-]{1,80}$/i.test(value))throw new Error('invalid_error_code');return value;};
const instant=value=>{const n=Date.parse(value);if(!Number.isFinite(n))throw new Error('invalid_time');return {iso:new Date(n).toISOString(),epoch:n};};
const json=(value,max=16000)=>{const encoded=JSON.stringify(value);if(!encoded||encoded.length>max)throw new Error('invalid_payload');return encoded;};
const changes=result=>Number(result?.meta?.changes||0);
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const ownerActor=(owner,actor)=>{if(actor!==owner&&actor!=='owner')throw new Error('owner_required');};
const settingsKeys=new Set(['ownerEmail','ownerEmailVerified','commercialPhone','ownerNotificationPhone','ownerNotificationVerified','ownerNotificationConsentRef','ownerNotificationsEnabled','ownerNotificationsSince','ownerNotificationTemplate','crmOrigin','research','calendar','testRecipients','providerMode','liveApproved','webhookVerified','waQuality','approvedTemplates','budgets','costPolicy','activationRef']);
function config(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!settingsKeys.has(k)))throw new Error('invalid_config');
 const scan=(v,depth=0)=>{if(depth>6)throw new Error('invalid_config');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(/secret|password|credential|api.?key|access.?token/i.test(k))throw new Error('secrets_not_allowed');scan(x,depth+1);}};scan(input);
 if(input.costPolicy!==undefined&&input.costPolicy!=='free_only')throw new Error('zero_cost_required');
 if(input.ownerEmail!==undefined&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.ownerEmail))throw new Error('invalid_email');
 for(const k of ['commercialPhone','ownerNotificationPhone'])if(input[k]!==undefined)input={...input,[k]:normalizeRecipient(input[k])};
 if(input.commercialPhone&&input.commercialPhone===input.ownerNotificationPhone)throw new Error('notification_phone_must_differ');
 for(const k of ['ownerNotificationVerified','ownerNotificationsEnabled'])if(input[k]!==undefined&&typeof input[k]!=='boolean')throw new Error('invalid_config');
 if(input.ownerNotificationConsentRef!==undefined)text(input.ownerNotificationConsentRef,300);
 if(input.ownerNotificationsSince!==undefined)instant(input.ownerNotificationsSince);
 if(input.ownerNotificationTemplate!==undefined){const t=input.ownerNotificationTemplate;if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['name','language'].includes(k))||!/^[a-z0-9_]{1,100}$/.test(t.name||'')||!/^\w{2,3}(?:_\w{2,4})?$/.test(t.language||''))throw new Error('invalid_owner_notice_template');}
 for(const k of ['ownerEmailVerified','liveApproved','webhookVerified'])if(input[k]!==undefined&&typeof input[k]!=='boolean')throw new Error('invalid_config');
 if(input.crmOrigin!==undefined){const url=new URL(input.crmOrigin);if(url.protocol!=='https:'||url.username||url.password||url.origin!==input.crmOrigin)throw new Error('invalid_crm_origin');}
 if(input.testRecipients!==undefined){if(!Array.isArray(input.testRecipients)||input.testRecipients.length>10)throw new Error('invalid_test_recipients');input={...input,testRecipients:input.testRecipients.map(normalizeRecipient)};}
 if(input.providerMode!==undefined&&!['mock','sandbox','live'].includes(input.providerMode))throw new Error('invalid_config');
 if(input.waQuality!==undefined&&!['unknown','healthy','degraded'].includes(input.waQuality))throw new Error('invalid_config');
 if(input.approvedTemplates!==undefined&&(!Array.isArray(input.approvedTemplates)||input.approvedTemplates.length>50||input.approvedTemplates.some(v=>typeof v!=='string'||!/^[a-z0-9_]{1,100}$/.test(v))))throw new Error('invalid_config');
 if(input.calendar!==undefined){const c=input.calendar;if(!c||typeof c!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(c.reviewedThrough)||!Array.isArray(c.holidays)||c.holidays.length>500||c.holidays.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)))throw new Error('invalid_calendar');}
 if(input.research!==undefined){
  const r=input.research,allowed=['researchEnabled','maxQueries','maxCostMicros','costPerQueryMicros','timeoutMs','knownCompanyLimit','priorities','contextualQueries'];
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!allowed.includes(k)))throw new Error('invalid_research_config');
  if(r.researchEnabled!==undefined&&typeof r.researchEnabled!=='boolean')throw new Error('invalid_research_config');
  for(const [k,min,max] of [['maxQueries',1,20],['maxCostMicros',0,0],['costPerQueryMicros',0,0],['timeoutMs',100,120000],['knownCompanyLimit',1,2000]])if(r[k]!==undefined&&(!Number.isSafeInteger(r[k])||r[k]<min||r[k]>max))throw new Error('invalid_research_config');
  if(r.priorities!==undefined&&(!Array.isArray(r.priorities)||r.priorities.length<1||r.priorities.length>3||new Set(r.priorities).size!==r.priorities.length||r.priorities.some(v=>typeof v!=='string'||!v.trim()||v.length>200)))throw new Error('invalid_research_config');
  if(r.contextualQueries!==undefined&&(!Array.isArray(r.contextualQueries)||r.contextualQueries.length>100||r.contextualQueries.some(q=>!q||typeof q!=='object'||Object.keys(q).some(k=>!['query','market','kind','evidenceRef','approved'].includes(k))||typeof q.query!=='string'||q.query.length>400||typeof q.market!=='string'||q.market.length>200||!['referral','event'].includes(q.kind)||typeof q.evidenceRef!=='string'||q.evidenceRef.length>500||typeof q.approved!=='boolean')))throw new Error('invalid_research_config');
 }
 if(input.budgets!==undefined){const b=input.budgets;if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['limitMicros','estimates'].includes(k)))throw new Error('invalid_budget_config');if(b.limitMicros!==undefined&&b.limitMicros!==0)throw new Error('zero_cost_required');if(b.estimates!==undefined&&(!b.estimates||typeof b.estimates!=='object'||Array.isArray(b.estimates)||Object.keys(b.estimates).length))throw new Error('zero_cost_required');}
 if(input.activationRef!==undefined)text(input.activationRef,200);
 // Saving an old account deliberately migrates its operational policy to zero.
 // Previously stored paid settings remain visible until explicitly replaced.
 input={...input,costPolicy:'free_only',budgets:{limitMicros:0,estimates:{}},...(input.research?{research:{...input.research,maxQueries:input.research.maxQueries??20,maxCostMicros:0,costPerQueryMicros:0}}:{})};
 json(input,12000);return input;
}
function output(row){return row?{...row,payload:row.payload?parse(row.payload):undefined}:null;}
function source(account,{sourceMode='unverified',simulated=true}={}){if(!['real','simulation','unverified'].includes(sourceMode)||typeof simulated!=='boolean')throw new Error('invalid_source');if(account.dryRun)return {mode:'simulation',simulated:1};return sourceMode==='real'&&simulated===false?{mode:'real',simulated:0}:{mode:sourceMode==='simulation'?'simulation':'unverified',simulated:1};}

// Persistence only. This class performs no network request and contains no secrets.
export class RuntimeStore{
 constructor(db){if(!db?.prepare||!db?.batch)throw new Error('database_unavailable');this.db=db;}
 async account(owner){const r=await this.db.prepare('SELECT * FROM prospecting_accounts WHERE owner=?').bind(text(owner)).first();return r?{owner:r.owner,account:r.account,dryRun:!!r.dry_run,killSwitch:!!r.kill_switch,config:parse(r.config)||{},revision:r.revision,updated:r.updated}:null;}
 async configureAccount(owner,input,now){
  owner=text(owner);const at=instant(now).iso,account=text(input?.account,120),current=await this.account(owner);
  if(current&&current.account!==account)throw new Error('account_immutable');
  if(current&&input.revision!==current.revision)throw new Error('revision_conflict');
  const dryRun=input.dryRun??current?.dryRun??true,killSwitch=input.killSwitch??current?.killSwitch??true;
  if(typeof dryRun!=='boolean'||typeof killSwitch!=='boolean')throw new Error('invalid_config');
  const encoded=json(config(input.config??current?.config??{}),12000);
  try{
   const r=current?await this.db.prepare('UPDATE prospecting_accounts SET dry_run=?,kill_switch=?,config=?,revision=revision+1,updated=? WHERE owner=? AND revision=?').bind(+dryRun,+killSwitch,encoded,at,owner,current.revision).run():await this.db.prepare('INSERT INTO prospecting_accounts(owner,account,dry_run,kill_switch,config,updated) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(owner,account,+dryRun,+killSwitch,encoded,at).run();
   if(changes(r)!==1)throw new Error('revision_conflict');
  }catch(e){if(e.message==='revision_conflict')throw e;throw new Error('account_configuration_conflict');}
  return this.account(owner);
 }
 async requireAccount(owner){const row=await this.account(owner);if(!row)throw new Error('account_not_configured');return row;}
 async consent(owner,phone){const row=await this.db.prepare('SELECT * FROM prospecting_consents WHERE owner=? AND recipient=?').bind(text(owner),normalizeRecipient(phone)).first();return row?{channel:row.channel,brand:row.brand,purpose:row.purpose,evidence:row.evidence,grantedAt:row.granted_at,expiresAt:row.expires_at,revokedAt:row.revoked_at,optOut:!!row.opt_out}:null;}
 async setConsent(owner,phone,input,now){
  await this.requireAccount(owner);const recipient=normalizeRecipient(phone),at=instant(now),grant=instant(input?.grantedAt),expires=input.expiresAt?instant(input.expiresAt):null;
  if(input.channel!=='whatsapp'||input.brand!=='Math Brands'||input.purpose!=='sites'||grant.epoch>at.epoch||(expires&&expires.epoch<=grant.epoch))throw new Error('invalid_consent');
  const evidence=text(input.evidence,2000),old=await this.consent(owner,recipient);
  if(old?.revokedAt&&grant.epoch<=Date.parse(old.revokedAt))throw new Error('consent_predates_revocation');
  const result=await this.db.prepare(`INSERT INTO prospecting_consents(owner,recipient,channel,brand,purpose,evidence,granted_at,expires_at,revoked_at,opt_out,updated) VALUES(?,?,?,?,?,?,?,?,NULL,0,?) ON CONFLICT(owner,recipient) DO UPDATE SET channel=excluded.channel,brand=excluded.brand,purpose=excluded.purpose,evidence=excluded.evidence,granted_at=excluded.granted_at,expires_at=excluded.expires_at,revoked_at=NULL,opt_out=0,updated=excluded.updated WHERE prospecting_consents.revoked_at IS NULL OR prospecting_consents.revoked_at<excluded.granted_at`).bind(owner,recipient,input.channel,input.brand,input.purpose,evidence,grant.iso,expires?.iso??null,at.iso).run();
  if(changes(result)!==1)throw new Error('consent_predates_revocation');
  return this.consent(owner,recipient);
 }
 async conversation(owner,phone){const row=await this.db.prepare('SELECT * FROM prospecting_conversations WHERE owner=? AND recipient=?').bind(text(owner),normalizeRecipient(phone)).first();return row?{...row,paused:!!row.paused,optedOut:!!row.opted_out,lastInbound:row.last_real_inbound,lastSimulatedInbound:row.last_simulated_inbound,opportunityId:row.opportunity_id}:null;}
 async ensureConversation(owner,phone,{opportunityId=null}={},now){
  await this.requireAccount(owner);const recipient=normalizeRecipient(phone),at=instant(now).iso;
  if(opportunityId){const opp=await this.db.prepare('SELECT id FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0').bind(owner,text(opportunityId,120)).first();if(!opp)throw new Error('opportunity_not_found');}
  await this.db.prepare('INSERT INTO prospecting_conversations(owner,recipient,opportunity_id,created,updated) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(owner,recipient,opportunityId,at,at).run();
  if(opportunityId)await this.db.prepare('UPDATE prospecting_conversations SET opportunity_id=?,revision=revision+1,updated=? WHERE owner=? AND recipient=? AND opportunity_id IS NULL').bind(opportunityId,at,owner,recipient).run();
  const row=await this.conversation(owner,recipient);if(opportunityId&&row.opportunityId!==opportunityId)throw new Error('conversation_link_conflict');return row;
 }
 async takeover(owner,phone,actor,now){
  ownerActor(owner,actor);const recipient=normalizeRecipient(phone),at=instant(now).iso;await this.ensureConversation(owner,recipient,{},now);
  await this.db.batch([
   this.db.prepare('UPDATE prospecting_conversations SET paused=1,lock_token=NULL,lock_until=0,revision=revision+1,updated=? WHERE owner=? AND recipient=?').bind(at,owner,recipient),
   this.db.prepare("UPDATE prospecting_outbox SET state=CASE WHEN state='sending' THEN 'uncertain' ELSE 'cancelled' END,token=NULL,lease_until=0,error_code='human_takeover',updated=? WHERE owner=? AND recipient=? AND channel='whatsapp' AND state IN ('pending','failed','preparing','sending')").bind(at,owner,recipient)
  ]);return this.conversation(owner,recipient);
 }
 async resume(owner,phone,actor,now){
  ownerActor(owner,actor);const recipient=normalizeRecipient(phone),at=instant(now).iso,c=await this.conversation(owner,recipient);if(!c)throw new Error('conversation_not_found');
  if(c.optedOut){const consent=await this.consent(owner,recipient);if(!consent||consent.optOut||consent.revokedAt)throw new Error('opt_out');}
  await this.db.prepare('UPDATE prospecting_conversations SET paused=0,opted_out=0,revision=revision+1,updated=? WHERE owner=? AND recipient=?').bind(at,owner,recipient).run();return this.conversation(owner,recipient);
 }
 async optOut(owner,phone,now){
  const recipient=normalizeRecipient(phone),at=instant(now).iso;await this.ensureConversation(owner,recipient,{},now);
  await this.db.batch([
   this.db.prepare('UPDATE prospecting_conversations SET paused=1,opted_out=1,lock_token=NULL,lock_until=0,revision=revision+1,updated=? WHERE owner=? AND recipient=?').bind(at,owner,recipient),
   this.db.prepare("INSERT INTO prospecting_consents(owner,recipient,channel,brand,purpose,evidence,granted_at,revoked_at,opt_out,updated) VALUES(?,?,'whatsapp','Math Brands','sites','Pedido de não contato registrado',?,?,1,?) ON CONFLICT(owner,recipient) DO UPDATE SET revoked_at=excluded.revoked_at,opt_out=1,updated=excluded.updated").bind(owner,recipient,at,at,at),
   this.db.prepare("UPDATE prospecting_outbox SET state=CASE WHEN state='sending' THEN 'uncertain' ELSE 'cancelled' END,token=NULL,lease_until=0,error_code='opt_out',updated=? WHERE owner=? AND recipient=? AND channel='whatsapp' AND state IN ('pending','failed','preparing','sending')").bind(at,owner,recipient)
  ]);return this.conversation(owner,recipient);
 }
 async claimConversation(owner,phone,token,now,ttlMs=60000){
  const recipient=normalizeRecipient(phone),at=instant(now);text(token,120);if(!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000)throw new Error('invalid_lease');
  const r=await this.db.prepare("UPDATE prospecting_conversations SET lock_token=?,lock_until=?,revision=revision+1,updated=? WHERE owner=? AND recipient=? AND paused=0 AND opted_out=0 AND (lock_token IS NULL OR lock_until<=?) AND NOT EXISTS(SELECT 1 FROM prospecting_outbox o WHERE o.owner=prospecting_conversations.owner AND o.recipient=prospecting_conversations.recipient AND o.channel='whatsapp' AND o.state='sending' AND o.lease_until>?)").bind(token,at.epoch+ttlMs,at.iso,owner,recipient,at.epoch,at.epoch).run();return changes(r)===1;
 }
 async conversationLeaseCurrent(owner,phone,token,now){const row=await this.conversation(owner,phone);return !!row&&!row.paused&&!row.optedOut&&row.lock_token===token&&row.lock_until>instant(now).epoch;}
 async releaseConversation(owner,phone,token){return changes(await this.db.prepare('UPDATE prospecting_conversations SET lock_token=NULL,lock_until=0 WHERE owner=? AND recipient=? AND lock_token=?').bind(text(owner),normalizeRecipient(phone),text(token,120)).run())===1;}
 async ingestInbox(owner,{eventId,recipient:phone,kind,payload,sourceMode='unverified',simulated=true},now){
  const account=await this.requireAccount(owner),recipient=normalizeRecipient(phone),at=instant(now).iso;text(eventId,200);if(!['message','status','human_echo'].includes(kind))throw new Error('invalid_inbox_kind');
  const origin=source(account,{sourceMode,simulated});
  const eventAt=kind==='message'?instant(payload?.at):null;if(eventAt&&eventAt.epoch>instant(now).epoch)throw new Error('future_inbound_event');
  await this.ensureConversation(owner,recipient,{},now);
  const statements=[this.db.prepare('INSERT INTO prospecting_inbox(account,event_id,owner,recipient,kind,payload,source_mode,simulated,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(account.account,eventId,owner,recipient,kind,json({...payload,simulated:origin.simulated===1}),origin.mode,origin.simulated,at)];
  if(kind==='human_echo')statements.push(this.db.prepare('UPDATE prospecting_conversations SET paused=1,lock_token=NULL,lock_until=0,revision=revision+1,updated=? WHERE owner=? AND recipient=? AND changes()=1').bind(at,owner,recipient),this.db.prepare("UPDATE prospecting_outbox SET state=CASE WHEN state='sending' THEN 'uncertain' ELSE 'cancelled' END,token=NULL,lease_until=0,error_code='human_takeover',updated=? WHERE owner=? AND recipient=? AND channel='whatsapp' AND state IN ('pending','failed','preparing','sending') AND changes()=1").bind(at,owner,recipient));
  if(kind==='message'&&origin.mode==='real')statements.push(this.db.prepare('UPDATE prospecting_conversations SET last_inbound=CASE WHEN last_inbound IS NULL OR last_inbound<? THEN ? ELSE last_inbound END,last_real_inbound=CASE WHEN last_real_inbound IS NULL OR last_real_inbound<? THEN ? ELSE last_real_inbound END,revision=revision+1,updated=? WHERE owner=? AND recipient=? AND changes()=1').bind(eventAt.iso,eventAt.iso,eventAt.iso,eventAt.iso,at,owner,recipient));
  else if(kind==='message')statements.push(this.db.prepare('UPDATE prospecting_conversations SET last_simulated_inbound=CASE WHEN last_simulated_inbound IS NULL OR last_simulated_inbound<? THEN ? ELSE last_simulated_inbound END,revision=revision+1,updated=? WHERE owner=? AND recipient=? AND changes()=1').bind(eventAt.iso,eventAt.iso,at,owner,recipient));
  const results=await this.db.batch(statements);return {inserted:changes(results[0])===1,eventId};
 }
 async inbox(owner,eventId){const a=await this.requireAccount(owner);return output(await this.db.prepare('SELECT * FROM prospecting_inbox WHERE owner=? AND account=? AND event_id=?').bind(owner,a.account,text(eventId,200)).first());}
 async claimInbox(owner,eventId,token,now,ttlMs=60000){
  const a=await this.requireAccount(owner),at=instant(now);text(token,120);if(!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000)throw new Error('invalid_lease');
  const r=await this.db.prepare("UPDATE prospecting_inbox SET state='processing',attempts=attempts+1,token=?,lease_until=?,error_code=NULL WHERE owner=? AND account=? AND event_id=? AND attempts<5 AND (state IN ('pending','failed') OR (state='processing' AND lease_until<=?))").bind(token,at.epoch+ttlMs,owner,a.account,text(eventId,200),at.epoch).run();return changes(r)===1?this.inbox(owner,eventId):null;
 }
 async finishInbox(owner,eventId,token,{state,errorCode=null},now){
  if(!['complete','failed'].includes(state))throw new Error('invalid_inbox_state');const a=await this.requireAccount(owner);
  return changes(await this.db.prepare("UPDATE prospecting_inbox SET state=CASE WHEN ?='failed' AND attempts>=5 THEN 'dlq' ELSE ? END,error_code=?,processed=?,token=NULL,lease_until=0 WHERE owner=? AND account=? AND event_id=? AND token=? AND state='processing'").bind(state,state,code(errorCode),instant(now).iso,owner,a.account,text(eventId,200),text(token,120)).run())===1;
 }
 async deferInbox(owner,eventId,token,now){
  const a=await this.requireAccount(owner);instant(now);
  return changes(await this.db.prepare("UPDATE prospecting_inbox SET state='pending',attempts=MAX(0,attempts-1),error_code='conversation_busy',processed=NULL,token=NULL,lease_until=0 WHERE owner=? AND account=? AND event_id=? AND token=? AND state='processing'").bind(owner,a.account,text(eventId,200),text(token,120)).run())===1;
 }
 async enqueueOutbox(owner,{key,recipient:raw,channel,payload,sourceMode='unverified',simulated=true},now){
  const a=await this.requireAccount(owner),at=instant(now).iso;text(key,200);if(!['whatsapp','email'].includes(channel))throw new Error('invalid_channel');
  const origin=source(a,{sourceMode,simulated});
  const recipient=channel==='whatsapp'?normalizeRecipient(raw):text(raw,254);if(channel==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw new Error('invalid_email');
  const encoded=json(payload,12000);
  if(channel==='whatsapp'){const c=await this.ensureConversation(owner,recipient,{},now);if(c.paused||c.optedOut)throw new Error('conversation_blocked');}
  const existing=await this.outbox(owner,key);if(existing){if(existing.channel!==channel||existing.recipient!==recipient||JSON.stringify(existing.payload)!==encoded||existing.source_mode!==origin.mode||existing.simulated!==origin.simulated)throw new Error('outbox_key_conflict');return {inserted:false,row:existing};}
  const r=await this.db.prepare('INSERT INTO prospecting_outbox(owner,key,account,recipient,channel,payload,source_mode,simulated,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(owner,key,a.account,recipient,channel,encoded,origin.mode,origin.simulated,at,at).run();const row=await this.outbox(owner,key);if(row.channel!==channel||row.recipient!==recipient||JSON.stringify(row.payload)!==encoded||row.source_mode!==origin.mode||row.simulated!==origin.simulated)throw new Error('outbox_key_conflict');return {inserted:changes(r)===1,row};
 }
 async outbox(owner,key){return output(await this.db.prepare('SELECT * FROM prospecting_outbox WHERE owner=? AND key=?').bind(text(owner),text(key,200)).first());}
 async reconcileExpiredOutbox(owner,now){const at=instant(now);return changes(await this.db.prepare("UPDATE prospecting_outbox SET state=CASE WHEN state='preparing' THEN 'pending' ELSE 'uncertain' END,token=NULL,lease_until=0,error_code=CASE WHEN state='preparing' THEN 'preparation_expired' ELSE 'lease_expired' END,updated=? WHERE owner=? AND state IN ('preparing','sending') AND lease_until<=?").bind(at.iso,text(owner),at.epoch).run());}
 async claimOutbox(owner,key,token,now,ttlMs=60000){
  const a=await this.requireAccount(owner),at=instant(now);if(a.killSwitch)return null;text(token,120);if(!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000)throw new Error('invalid_lease');
  await this.reconcileExpiredOutbox(owner,now);
  const r=await this.db.prepare(`UPDATE prospecting_outbox SET state='preparing',token=?,lease_until=?,updated=? WHERE owner=? AND key=? AND account=? AND state IN ('pending','failed') AND next_attempt<=? AND attempts<3 AND EXISTS(SELECT 1 FROM prospecting_accounts a WHERE a.owner=prospecting_outbox.owner AND a.account=prospecting_outbox.account AND a.kill_switch=0 AND (a.dry_run=1 OR (prospecting_outbox.source_mode='real' AND prospecting_outbox.simulated=0))) AND (channel='email' OR EXISTS(SELECT 1 FROM prospecting_conversations c WHERE c.owner=prospecting_outbox.owner AND c.recipient=prospecting_outbox.recipient AND c.paused=0 AND c.opted_out=0 AND c.lock_token=? AND c.lock_until>?))`).bind(token,at.epoch+ttlMs,at.iso,owner,text(key,200),a.account,at.epoch,token,at.epoch).run();return changes(r)===1?this.outbox(owner,key):null;
 }
 async outboxLeaseCurrent(owner,key,token,now){const a=await this.requireAccount(owner),row=await this.outbox(owner,key),at=instant(now);if(a.killSwitch||!row||!['preparing','sending'].includes(row.state)||row.token!==token||row.lease_until<=at.epoch||(!a.dryRun&&(row.source_mode!=='real'||row.simulated!==0)))return false;if(row.channel==='whatsapp'&&!await this.conversationLeaseCurrent(owner,row.recipient,token,now))return false;return true;}
 async beginOutboxDispatch(owner,key,token,{accountRevision},now){
  const at=instant(now);if(!Number.isSafeInteger(accountRevision)||accountRevision<1)throw new Error('invalid_account_revision');
  return changes(await this.db.prepare(`UPDATE prospecting_outbox SET state='sending',attempts=attempts+1,lease_until=?,updated=? WHERE owner=? AND key=? AND state='preparing' AND token=? AND lease_until>? AND attempts<3 AND EXISTS(SELECT 1 FROM prospecting_accounts a WHERE a.owner=prospecting_outbox.owner AND a.account=prospecting_outbox.account AND a.revision=? AND a.kill_switch=0 AND (a.dry_run=1 OR (prospecting_outbox.source_mode='real' AND prospecting_outbox.simulated=0))) AND (channel='email' OR EXISTS(SELECT 1 FROM prospecting_conversations c WHERE c.owner=prospecting_outbox.owner AND c.recipient=prospecting_outbox.recipient AND c.paused=0 AND c.opted_out=0 AND c.lock_token=? AND c.lock_until>?))`).bind(at.epoch+60000,at.iso,text(owner),text(key,200),text(token,120),at.epoch,accountRevision,token,at.epoch).run())===1;
 }
 async recordAcceptedReceipt(owner,key,{providerId},now){
  text(providerId,200);const row=await this.outbox(owner,key);if(!row||row.state!=='uncertain')return false;if(row.provider_id&&row.provider_id!==providerId)throw new Error('provider_receipt_conflict');
  return changes(await this.db.prepare("UPDATE prospecting_outbox SET provider_id=?,error_code='accepted_after_interrupt',updated=? WHERE owner=? AND key=? AND state='uncertain' AND (provider_id IS NULL OR provider_id=?)").bind(providerId,instant(now).iso,text(owner),text(key,200),providerId).run())===1;
 }
 async finishOutbox(owner,key,token,{state,providerId=null,errorCode=null,retryAfterMs=60000},now){
  if(!['sent','simulated','uncertain','failed','dlq'].includes(state))throw new Error('invalid_outbox_state');const at=instant(now);if(!Number.isSafeInteger(retryAfterMs)||retryAfterMs<1000||retryAfterMs>86400000)throw new Error('invalid_retry');if(providerId!==null)text(providerId,200);if(['sent','simulated'].includes(state)&&!providerId)throw new Error('provider_receipt_required');
  return changes(await this.db.prepare("UPDATE prospecting_outbox SET state=CASE WHEN ?='failed' AND attempts>=3 THEN 'dlq' ELSE ? END,provider_id=?,error_code=?,next_attempt=?,token=NULL,lease_until=0,updated=? WHERE owner=? AND key=? AND token=? AND (state='sending' OR (state='preparing' AND ? IN ('simulated','failed','dlq')))").bind(state,state,providerId,code(errorCode),state==='failed'?at.epoch+retryAfterMs:0,at.iso,text(owner),text(key,200),text(token,120),state).run())===1;
 }
 async deferUnsentFreeOutbox(owner,key,token,errorCode,now){
  // These errors originate before fetch in our free providers. Never use this
  // recovery for transport failures, receipts or uncertain HTTP outcomes.
  if(!['provider_free_quota_exhausted','provider_quota_unavailable','provider_free_plan_unverified','free_service_window_required','provider_disabled'].includes(errorCode))throw new Error('invalid_free_deferral');
  const at=instant(now);
  return changes(await this.db.prepare("UPDATE prospecting_outbox SET state='pending',attempts=attempts-1,error_code=?,next_attempt=?,token=NULL,lease_until=0,updated=? WHERE owner=? AND key=? AND state='sending' AND token=? AND lease_until>? AND attempts>0 AND provider_id IS NULL AND EXISTS(SELECT 1 FROM prospecting_accounts a WHERE a.owner=prospecting_outbox.owner AND a.dry_run=0 AND json_extract(a.config,'$.costPolicy')='free_only')").bind(errorCode,at.epoch+60000,at.iso,text(owner),text(key,200),text(token,120),at.epoch).run())===1;
 }
 async createHandoff(owner,{opportunityId,eventId,summary,nextAction='Assumir atendimento do Projeto Especial'},now){
  const at=instant(now).iso;owner=text(owner);opportunityId=text(opportunityId,120);eventId=text(eventId,200);summary=text(summary,2000);nextAction=text(nextAction,500);
  const existing=await this.db.prepare('SELECT * FROM prospecting_handoffs WHERE owner=? AND event_id=?').bind(owner,eventId).first();
  if(existing){if(existing.opportunity_id!==opportunityId||existing.summary!==summary)throw new Error('handoff_event_conflict');return {created:false,opportunityId};}
  const id='runtime_handoff_'+await hash(owner+'\n'+eventId);
  const results=await this.db.batch([
   this.db.prepare("INSERT INTO prospecting_handoffs(owner,event_id,opportunity_id,summary,status,created) SELECT ?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0) ON CONFLICT DO NOTHING").bind(owner,eventId,opportunityId,summary,at,owner,opportunityId),
   this.db.prepare('UPDATE commercial_opportunities SET next_action=?,revision=revision+1,updated=? WHERE owner=? AND id=? AND changes()=1').bind(nextAction,at,owner,opportunityId),
   this.db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(id,owner,opportunityId,'Atendimento comercial aguarda responsável',json({kind:'automation_handoff',eventId,summary,nextAction}),at)
  ]);
  if(changes(results[0])!==1){const replay=await this.db.prepare('SELECT * FROM prospecting_handoffs WHERE owner=? AND event_id=?').bind(owner,eventId).first();if(replay?.opportunity_id===opportunityId&&replay.summary===summary)return {created:false,opportunityId};if(replay)throw new Error('handoff_event_conflict');throw new Error('opportunity_not_found');}return {created:true,opportunityId};
 }
 async summary(owner){
  owner=text(owner);const account=await this.account(owner);const counts=async table=>(await this.db.prepare('SELECT state,COUNT(*) AS count FROM '+table+' WHERE owner=? GROUP BY state').bind(owner).all()).results;
  const [inbox,outbox,conversations,pendingHandoffs]=await Promise.all([counts('prospecting_inbox'),counts('prospecting_outbox'),this.db.prepare('SELECT COUNT(*) AS total,COALESCE(SUM(paused),0) AS paused,COALESCE(SUM(opted_out),0) AS optedOut FROM prospecting_conversations WHERE owner=?').bind(owner).first(),this.db.prepare("SELECT COUNT(*) AS count FROM prospecting_handoffs WHERE owner=? AND status='pending'").bind(owner).first()]);
  return {account,inbox,outbox,conversations,pendingHandoffs:Number(pendingHandoffs?.count||0)};
 }
}
