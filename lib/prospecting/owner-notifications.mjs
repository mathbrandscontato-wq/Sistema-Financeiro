import {normalizeRecipient} from './policy.mjs';

const CRM_ORIGIN='https://mathbrands-orcamentos.mthsdoliveira.chatgpt.site';
const clockNow=()=>new Date().toISOString();
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(value);
const ref=value=>typeof value==='string'&&!!value.trim()&&value.length<=300;
const iso=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))return null;
 const normalized=new Date(value).toISOString();return normalized.slice(0,19)===value.slice(0,19)?normalized:null;
};
const blocked=reason=>({status:'blocked',reason});

/** Private readiness only. This is an internal operational opt-in, not prospect consent. */
export function ownerNotificationReadiness(config={},now=clockNow()){
 if(config.ownerNotificationsEnabled!==true)return {status:'disabled',reason:'owner_notices_disabled'};
 let recipient;try{recipient=normalizeRecipient(config.ownerNotificationPhone);}catch{return blocked('owner_notice_recipient_required');}
 if(config.ownerNotificationVerified!==true||!ref(config.ownerNotificationConsentRef))return blocked('owner_notice_consent_required');
 const since=iso(config.ownerNotificationsSince),current=iso(now);
 if(!since||!current||Date.parse(since)>Date.parse(current))return blocked('owner_notice_activation_invalid');
 const template=config.ownerNotificationTemplate;
 if(!template||typeof template!=='object'||Array.isArray(template)||Object.keys(template).some(k=>!['name','language'].includes(k))||!/^[a-z0-9_]{1,100}$/.test(template.name||'')||!/^\w{2,3}(?:_\w{2,4})?$/.test(template.language||'')||!Array.isArray(config.approvedTemplates)||!config.approvedTemplates.includes(template.name))return blocked('owner_notice_template_required');
 if(config.crmOrigin!==undefined&&config.crmOrigin!==CRM_ORIGIN)return blocked('owner_notice_crm_origin_invalid');
 return {status:'ready',reason:'owner_notice_ready',recipient,since,consentRef:config.ownerNotificationConsentRef.trim(),template:{name:template.name,language:template.language}};
}

const eligibleSQL=`SELECT c.id,c.owner,c.opportunity_id,c.created,
 (SELECT h.id FROM financial_history h WHERE h.owner=c.owner AND h.contract_id=c.id AND h.action='Contratação confirmada manualmente' AND json_extract(CASE WHEN json_valid(h.data) THEN h.data ELSE '{}' END,'$.action')='contract_create' AND julianday(h.created)>julianday(?) AND julianday(h.created)<=julianday(?) ORDER BY h.created,h.id LIMIT 1) AS confirmation_ref
 FROM commercial_contracts c JOIN commercial_opportunities o ON o.owner=c.owner AND o.id=c.opportunity_id
 WHERE c.owner=? AND c.status='Confirmado manualmente' AND c.active=1 AND o.stage='Fechado' AND o.archived=0 AND julianday(c.created)>julianday(?) AND julianday(c.created)<=julianday(?)`;

function notice(contract,ready){
 if(!id(contract.id)||!id(contract.opportunity_id)||!id(contract.confirmation_ref))return null;
 const link=CRM_ORIGIN+'/?opportunity='+encodeURIComponent(contract.opportunity_id);
 return {key:'owner-deal:'+contract.id,recipient:ready.recipient,channel:'whatsapp',payload:{kind:'owner_deal_notice',source:'crm_manual_confirmation',proactive:false,contractId:contract.id,opportunityId:contract.opportunity_id,confirmationRef:contract.confirmation_ref,consentRef:ready.consentRef,enabledSince:ready.since,text:'Negócio confirmado manualmente no CRM da Math Brands. Referência: '+contract.id+'. Consulte: '+link+'. Este aviso não confirma recebimento.',template:{approved:true,name:ready.template.name,language:ready.template.language,parameters:[contract.id,link]}}};
}

/** Reads manual confirmations and enqueues only; contains no provider or financial writes. */
export async function reconcileOwnerNotifications({db,store,owner,clock=clockNow,limit=10}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('invalid_owner_notice_limit');
 const account=await store.account(owner),now=clock(),empty={queued:0,existing:0,blocked:0};
 if(!account)return {...blocked('account_not_configured'),...empty};
 const ready=ownerNotificationReadiness(account.config,now);
 if(ready.status!=='ready')return {status:ready.status,reason:ready.reason,...empty};
 if(account.killSwitch)return {...blocked('kill_switch'),...empty};
 const result={status:'ready',reason:'owner_notice_reconciled',...empty};
 const rows=(await db.prepare(`SELECT * FROM (${eligibleSQL}) eligible WHERE confirmation_ref IS NOT NULL AND NOT EXISTS(SELECT 1 FROM prospecting_outbox q WHERE q.owner=eligible.owner AND q.key='owner-deal:'||eligible.id) ORDER BY created,id LIMIT ?`).bind(ready.since,now,owner,ready.since,now,limit).all()).results;
 for(const contract of rows){
  const draft=notice(contract,ready);if(!draft){result.blocked++;continue;}
  // Configuration/contract can change before delivery; validateOwnerNotification is mandatory then.
  try{const queued=await store.enqueueOutbox(owner,{...draft,sourceMode:account.dryRun?'simulation':'real',simulated:account.dryRun},now);if(queued.inserted)result.queued++;else result.existing++;}
  catch{result.blocked++;}
 }
 return result;
}

/** Mandatory final gate immediately before an official transport attempts this outbox row. */
export async function validateOwnerNotification({db,store,owner,row,clock=clockNow}){
 const deny=reason=>({allowed:false,reason});
 const account=await store.account(owner),now=clock();if(!account)return deny('account_not_configured');
 if(account.killSwitch)return deny('kill_switch');
 const ready=ownerNotificationReadiness(account.config,now);if(ready.status!=='ready')return deny(ready.reason);
 if(!row||row.owner!==owner||row.account!==account.account||row.channel!=='whatsapp'||row.recipient!==ready.recipient||row.payload?.kind!=='owner_deal_notice'||!id(row.payload.contractId))return deny('owner_notice_target_invalid');
 if(!account.dryRun&&(row.source_mode!=='real'||row.simulated!==0))return deny('owner_notice_simulation_not_promoted');
 const conversation=await store.conversation(owner,ready.recipient);if(!conversation||conversation.paused||conversation.optedOut)return deny('owner_notice_conversation_blocked');
 const contract=await db.prepare(`${eligibleSQL} AND c.id=?`).bind(ready.since,now,owner,ready.since,now,row.payload.contractId).first();
 if(!contract?.confirmation_ref)return deny('owner_notice_confirmation_invalid');
 const expected=notice(contract,ready);if(!expected||row.key!==expected.key||JSON.stringify(row.payload)!==JSON.stringify(expected.payload))return deny('owner_notice_content_changed');
 return {allowed:true,reason:'owner_notice_allowed'};
}
