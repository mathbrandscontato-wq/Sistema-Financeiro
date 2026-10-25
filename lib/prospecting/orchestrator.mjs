import {RuntimeStore} from './runtime-store.mjs';
import {ProspectingStore} from './store.mjs';
import {contactPolicy,consult,normalizeRecipient} from './policy.mjs';
import {validateCommercialReply} from './agent.mjs';
import {handoffDraft} from './handoff.mjs';
import {planCreateClient,planCreateOpportunity} from '../crm.mjs';
import {stableId} from '../commercial-import.mjs';
import {reconcileOwnerNotifications,validateOwnerNotification} from './owner-notifications.mjs';
import {freeServiceWindow} from './free-cost.mjs';

const HANDOFF_EVENTS=new Set(['interesse_explicito','technical_review','handoff_requested','financial_review']);
const policyExamples=['oi','Qual o preço?','Preciso de integração','Quero contratar','Já paguei','Quero humano','Não quero mensagens','Tenho Instagram','Está caro','Vou pensar','Quero briefing'];
const policyReplies=new Set(policyExamples.map(message=>consult(message).reply));
const realSource=row=>row?.source_mode==='real'&&row?.simulated===0;
const rowSource=row=>({sourceMode:row.source_mode,simulated:row.simulated!==0});
const safeCode=e=>/^[a-z0-9_-]{1,80}$/i.test(e?.code||e?.message||'')?(e.code||e.message):'runtime_processing_failed';
const jsonParse=value=>{try{return JSON.parse(value);}catch{return null;}};
const boundedLimit=value=>{if(!Number.isInteger(value)||value<1||value>50)throw new Error('invalid_processing_limit');return value;};
const uuid=async value=>{const h=await stableId('runtime','mutation',value),s=h.slice(-64,-32);return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
const summaryFor=event=>({interesse_explicito:'O interessado solicitou contratação do Projeto Especial. Avaliação humana e briefing pendentes.',technical_review:'O interessado fez uma solicitação que exige avaliação humana de viabilidade e condições.',handoff_requested:'O interessado solicitou atendimento humano.',financial_review:'O interessado mencionou pagamento ou comprovante. Confirmação financeira não realizada.'})[event]||'Resposta comercial precisa de revisão humana.';

export function createCommercialRuntime({db,owner,clock=()=>new Date().toISOString(),agent,whatsapp,email,beforeWrite=async()=>{},liveNetworkApproved=false,beforeSend}={}){
 const store=new RuntimeStore(db),prospecting=new ProspectingStore(db),now=()=>new Date(clock()).toISOString();
 if(typeof owner!=='string'||!owner.trim())throw new Error('invalid_owner');
 const query=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
 const applyPlan=async plan=>db.batch(plan.statements.map(s=>db.prepare(s.sql).bind(...s.args)));

 async function receiveNormalizedEvents(events){
  if(!Array.isArray(events)||events.length>100)throw new Error('invalid_event_batch');
  const account=await store.requireAccount(owner),result={accepted:0,duplicates:0,ignored:0};
  for(const e of events){
   if(!e||e.accountId!==account.account||typeof e.eventId!=='string'||!['inbound','status','human_echo'].includes(e.kind)){result.ignored++;continue;}
   let recipient=e.recipient;
   if(e.kind==='status'){
    const matches=await query("SELECT recipient FROM prospecting_outbox WHERE owner=? AND account=? AND channel='whatsapp' AND provider_id=? LIMIT 2",owner,account.account,e.providerId);
    if(matches.length!==1||!['sent','delivered','read','failed'].includes(e.status)){result.ignored++;continue;}recipient=matches[0].recipient;
   }
   const payload={at:e.at,providerId:e.providerId||null,...(e.kind==='inbound'?{text:typeof e.text==='string'?e.text.slice(0,4000):null,messageType:e.messageType||'unknown'}:{}),...(e.kind==='status'?{status:e.status,errorCodes:(e.errorCodes||[]).filter(Number.isSafeInteger).slice(0,5)}:{})};
   const r=await store.ingestInbox(owner,{eventId:e.eventId,recipient,kind:e.kind==='inbound'?'message':e.kind,payload,sourceMode:account.dryRun||e.simulated===true?'simulation':'real',simulated:account.dryRun||e.simulated===true},now());
   if(r.inserted)result.accepted++;else result.duplicates++;
  }return result;
 }
 async function findClient(phone){
  const rows=await query('SELECT * FROM commercial_clients WHERE owner=? AND archived=0 AND phone IS NOT NULL',owner),matches=rows.filter(c=>{try{return normalizeRecipient(c.phone)===phone;}catch{return false;}});
  if(matches.length>1)throw new Error('ambiguous_existing_contact');return matches[0]||null;
 }
 async function ensureCRM(inbox,conversation){
  if(inbox.kind!=='message')throw new Error('legitimate_inbound_required');
  if(conversation.opportunityId){const opp=await db.prepare('SELECT * FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0').bind(owner,conversation.opportunityId).first();if(!opp)throw new Error('opportunity_not_found');return opp;}
  const account=await store.requireAccount(owner),phone=inbox.recipient;let client=await findClient(phone),clientPlan=null;
  if(client){
   const existing=await query("SELECT * FROM commercial_opportunities WHERE owner=? AND client_id=? AND archived=0 AND stage NOT IN ('Fechado','Recusado') ORDER BY created DESC",owner,client.id);
   const sites=existing.filter(o=>/site/i.test([o.service,o.title,o.intent].join(' ')));if(sites.length>1)throw new Error('ambiguous_existing_opportunity');
   if(sites.length===1){await store.ensureConversation(owner,phone,{opportunityId:sites[0].id},now());return sites[0];}
  }else{
   clientPlan=await planCreateClient(owner,{displayName:'Contato WhatsApp '+phone,phone,origin:'WhatsApp · contato iniciado pelo interessado',notes:'Identificação da empresa e nome ainda precisam ser confirmados.'},await uuid(account.account+':'+phone+':client'),now());
   client={id:clientPlan.id,owner,revision:1,archived:0};
  }
  const plan=await planCreateOpportunity(owner,{clientId:client.id,title:'Site · Projeto Especial',amount:'',stage:'Qualificação',service:'Site · Projeto Especial',origin:'WhatsApp · contato iniciado pelo interessado',intent:'Solicitação recebida por canal oficial',nextAction:'Avaliar contexto comercial e confirmar identificação do interessado'},await uuid(account.account+':'+phone+':sites-opportunity'),client,now());
  const existing=await db.prepare('SELECT * FROM commercial_opportunities WHERE owner=? AND id=?').bind(owner,plan.id).first();
  if(existing){if(existing.archived||['Fechado','Recusado'].includes(existing.stage))throw new Error('existing_project_requires_human_review');await store.ensureConversation(owner,phone,{opportunityId:existing.id},now());return existing;}
  await beforeWrite('Antes de registrar interesse legítimo recebido no WhatsApp');
  const statements=[...(clientPlan?.statements||[]),...plan.statements],results=await applyPlan({statements});
  if(Number(results[clientPlan?.statements.length||0]?.meta?.changes)!==1)throw new Error('crm_revision_conflict');
  await store.ensureConversation(owner,phone,{opportunityId:plan.id},now());return db.prepare('SELECT * FROM commercial_opportunities WHERE owner=? AND id=?').bind(owner,plan.id).first();
 }
 async function handoff(inbox,conversation,event){
  const opp=await ensureCRM(inbox,conversation),summary=summaryFor(event),eventId='handoff:'+inbox.event_id;
  await beforeWrite('Antes de encaminhar atendimento comercial ao responsável');
  await store.createHandoff(owner,{opportunityId:opp.id,eventId,summary},now());
  const queued=await queueHandoffEmail(opp,inbox.recipient,eventId,summary,rowSource(inbox));return {opportunityId:opp.id,email:queued?'queued':'pending_configuration'};
 }
 async function queueHandoffEmail(opp,recipient,eventId,summary,origin){
  const account=await store.requireAccount(owner),settings=account.config;
  if(!account.dryRun&&(origin?.sourceMode!=='real'||origin?.simulated!==false))return false;
  if(!settings.ownerEmailVerified||!settings.ownerEmail||!settings.crmOrigin)return false;
  const client=await db.prepare('SELECT * FROM commercial_clients WHERE owner=? AND id=?').bind(owner,opp.client_id).first();
  const crmUrl=new URL('/',settings.crmOrigin);crmUrl.searchParams.set('opportunity',opp.id);
  const draft=handoffDraft({recipient:settings.ownerEmail,recipientVerified:true,crmUrl:crmUrl.href,allowedCRMOrigin:settings.crmOrigin,customer:{phone:recipient,name:client?.contact_name||'Nome ainda não informado',company:client?.display_name?.startsWith('Contato WhatsApp ')?'Empresa ainda não informada':client?.display_name,segment:client?.segment,summary},briefing:'Aguardando verificação no CRM',pix:'Não enviado pela automação',payment:'Não confirmado pela automação',pending:summary,nextAction:'Assumir atendimento e confirmar as condições aplicáveis.'});
  await store.enqueueOutbox(owner,{key:'email:'+eventId,recipient:draft.to,channel:'email',payload:{subject:draft.subject,text:draft.text,opportunityId:opp.id,handoffEventId:eventId},...origin},now());
  return true;
 }
 async function reconcileHandoffs({limit=10}={}){
  boundedLimit(limit);const a=await store.requireAccount(owner);if(!a.config.ownerEmailVerified||!a.config.ownerEmail||!a.config.crmOrigin)return {queued:0,blocked:true};
  const rows=await query(`SELECT h.*,i.recipient,i.source_mode,i.simulated
   FROM prospecting_handoffs h
   JOIN prospecting_inbox i ON i.owner=h.owner AND h.event_id='handoff:'||i.event_id
   JOIN commercial_opportunities o ON o.owner=h.owner AND o.id=h.opportunity_id AND o.archived=0
   WHERE h.owner=? AND h.status='pending'
    AND (?=1 OR (i.source_mode='real' AND i.simulated=0))
    AND NOT EXISTS (SELECT 1 FROM prospecting_outbox b WHERE b.owner=h.owner AND b.key='email:'||h.event_id)
   ORDER BY h.created,h.event_id LIMIT ?`,owner,+a.dryRun,limit);let queued=0;
  for(const h of rows){if(await store.outbox(owner,'email:'+h.event_id))continue;const opp=await db.prepare('SELECT * FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0').bind(owner,h.opportunity_id).first();if(opp&&await queueHandoffEmail(opp,h.recipient,h.event_id,h.summary,rowSource(h)))queued++;}
  return {queued,blocked:false};
 }
 async function recordDelivery(inbox){
  const conversation=await store.conversation(owner,inbox.recipient);if(!conversation?.opportunityId)return;
  const id=await stableId(owner,'automation-delivery',inbox.event_id);
  await db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) SELECT ?,owner,id,?,?,? FROM commercial_opportunities WHERE owner=? AND id=? ON CONFLICT(id) DO NOTHING').bind(id,'Atualização de entrega do WhatsApp',JSON.stringify({kind:'whatsapp_delivery',status:inbox.payload.status,providerId:inbox.payload.providerId,eventAt:inbox.payload.at}),now(),owner,conversation.opportunityId).run();
 }
 async function agentContext(inbox,conversation){
  let company={};if(conversation.opportunityId){const client=await db.prepare('SELECT c.display_name,c.segment FROM commercial_clients c JOIN commercial_opportunities o ON o.client_id=c.id AND o.owner=c.owner WHERE o.owner=? AND o.id=? AND c.archived=0').bind(owner,conversation.opportunityId).first();if(client)company={name:client.display_name,segment:client.segment||''};}
  const inbound=await query("SELECT payload,created FROM prospecting_inbox WHERE owner=? AND recipient=? AND kind='message' AND event_id<>? AND source_mode='real' AND simulated=0 ORDER BY created DESC LIMIT 4",owner,inbox.recipient,inbox.event_id);
  const outbound=await query("SELECT payload,created FROM prospecting_outbox WHERE owner=? AND recipient=? AND channel='whatsapp' AND source_mode='real' AND simulated=0 AND state='sent' ORDER BY created DESC LIMIT 4",owner,inbox.recipient);
  const history=[...inbound.map(r=>({...r,role:'user'})),...outbound.map(r=>({...r,role:'assistant'}))].sort((a,b)=>a.created.localeCompare(b.created)).flatMap(r=>{const p=jsonParse(r.payload);return typeof p?.text==='string'?[{role:r.role,text:p.text.slice(0,1000)}]:[];});
  return {message:inbox.payload.text,paused:false,company,history};
 }
 async function processInbox({limit=10}={}){
  boundedLimit(limit);const account=await store.requireAccount(owner),epoch=Date.parse(now());
  const candidates=await query("SELECT event_id,kind,source_mode,simulated FROM prospecting_inbox WHERE owner=? AND attempts<5 AND (state IN ('pending','failed') OR (state='processing' AND lease_until<=?)) ORDER BY created,event_id LIMIT ?",owner,epoch,limit);
  const result={processed:0,blocked:0,failed:0,handoffs:0,replies:0};
  for(const candidate of candidates){
   if((account.killSwitch&&candidate.kind==='message')||(!account.dryRun&&!realSource(candidate))){result.blocked++;continue;}
   const token=crypto.randomUUID(),inbox=await store.claimInbox(owner,candidate.event_id,token,now());if(!inbox)continue;
   let locked=false;
   try{
    if(inbox.kind==='status'){await recordDelivery(inbox);await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;continue;}
    if(inbox.kind==='human_echo'){await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;continue;}
    // The private alert destination is the owner, never a customer lead or bot command channel.
    if(account.config.ownerNotificationPhone===inbox.recipient){
     if(consult(inbox.payload.text||'').event==='opt_out')await store.optOut(owner,inbox.recipient,now());
     await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;continue;
    }
    const conversation=await store.conversation(owner,inbox.recipient);
    if(conversation.paused||conversation.optedOut){await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.blocked++;continue;}
    locked=await store.claimConversation(owner,inbox.recipient,token,now());if(!locked){await store.deferInbox(owner,inbox.event_id,token,now());result.blocked++;continue;}
    if(await store.outbox(owner,'reply:'+inbox.event_id)){await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;continue;}
    const message=inbox.payload?.text,base=typeof message==='string'&&message.trim()?{...consult(message),mode:'policy'}:{...consult('Preciso de integração'),mode:'policy'};
    let answer=base;
    const activeAccount=await store.requireAccount(owner);
    if(agent?.respond&&!activeAccount.dryRun&&!activeAccount.killSwitch&&liveNetworkApproved&&typeof message==='string'&&message.trim()){
     try{answer=await agent.respond(await agentContext(inbox,conversation));}catch{answer=base;}
    }
    if(answer.event==='opt_out'){await store.optOut(owner,inbox.recipient,now());await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;continue;}
    if(answer.mode==='model'&&!validateCommercialReply({action:'respond',reason:answer.event,reply:answer.reply,evidenceIds:answer.evidenceIds||[]},[]))answer={...consult('Preciso de integração'),mode:'policy',requiresReview:true};
    if(answer.mode!=='model'&&!policyReplies.has(answer.reply))answer=base;
    if(answer.requiresReview||HANDOFF_EVENTS.has(answer.event)){await handoff(inbox,conversation,answer.requiresReview?'technical_review':answer.event);result.handoffs++;}
    const state=await store.conversation(owner,inbox.recipient),current=await store.requireAccount(owner);
    const decision=contactPolicy({now:now(),killSwitch:current.killSwitch,quality:current.config.waQuality,paused:state.paused,optOut:state.optedOut,proactive:false,lastInbound:current.dryRun?state.lastSimulatedInbound:state.lastInbound});
    const recent=await db.prepare("SELECT COUNT(*) AS n FROM prospecting_outbox WHERE owner=? AND recipient=? AND channel='whatsapp' AND source_mode=? AND created>?").bind(owner,inbox.recipient,current.dryRun?'simulation':'real',new Date(Date.parse(now())-3600000).toISOString()).first();
    if(!answer.requiresReview&&decision==='allowed'&&Number(recent.n)<20&&await store.conversationLeaseCurrent(owner,inbox.recipient,token,now())){
     await store.enqueueOutbox(owner,{key:'reply:'+inbox.event_id,recipient:inbox.recipient,channel:'whatsapp',payload:{kind:'text_reply',text:answer.reply,source:answer.mode==='model'?'model':'policy',event:answer.event,proactive:false,pauseAfterSend:answer.event==='handoff_requested'},...rowSource(inbox)},now());result.replies++;
    }else if(answer.event==='handoff_requested')await store.takeover(owner,inbox.recipient,'owner',now());
    await store.finishInbox(owner,inbox.event_id,token,{state:'complete'},now());result.processed++;
   }catch(e){await store.finishInbox(owner,inbox.event_id,token,{state:'failed',errorCode:safeCode(e)},now());result.failed++;}
   finally{if(locked)await store.releaseConversation(owner,inbox.recipient,token);}
  }return result;
 }
 function replyApproved(row,account){
  const p=row.payload||{};if(p.kind==='approved_pix'||p.kind==='owner_deal_notice')return typeof beforeSend==='function';
  if(p.template)return p.template.approved===true&&(account.config.approvedTemplates||[]).includes(p.template.name);
  if(policyReplies.has(p.text))return true;
  return false; // Generated prose always requires human review in this version.
 }
 async function whatsappPolicy(row,account){
  const conversation=await store.conversation(owner,row.recipient),consent=await store.consent(owner,row.recipient),p=row.payload||{};
  if(!conversation)return {decision:'conversation_missing',conversation};
  if(!account.dryRun&&account.config.costPolicy==='free_only'&&(p.template||!freeServiceWindow(conversation.lastInbound,now())))return {decision:'free_service_window_required',conversation};
  if(p.kind==='owner_deal_notice'){
   const gate=await validateOwnerNotification({db,store,owner,row,clock:now});
   return {conversation,decision:gate.allowed&&account.config.waQuality==='healthy'?'allowed':gate.allowed?'quality_unknown':gate.reason};
  }
  return {conversation,decision:contactPolicy({now:now(),killSwitch:account.killSwitch,quality:account.config.waQuality,calendar:account.config.calendar,consent,optOut:conversation.optedOut,paused:conversation.paused,lastInbound:account.dryRun?conversation.lastSimulatedInbound:conversation.lastInbound,proactive:p.proactive===true,templateApproved:p.template?.approved===true&&(account.config.approvedTemplates||[]).includes(p.template?.name)})};
 }
 async function flushOutbox({limit=10}={}){
  boundedLimit(limit);await reconcileHandoffs({limit});await reconcileOwnerNotifications({db,store,owner,clock:now,limit});await store.reconcileExpiredOutbox(owner,now());
  const at=now(),epoch=Date.parse(at),schedulingAccount=await store.requireAccount(owner),freeOnly=!schedulingAccount.dryRun&&schedulingAccount.config.costPolicy==='free_only';
  // Waiting for a free WhatsApp window must not occupy the whole delivery batch
  // and starve newer e-mails or replies. Keep rows pending, with no retry delay,
  // so a real inbound can make them eligible immediately on the next flush.
  const freeEligibility=freeOnly?` AND q.source_mode='real' AND q.simulated=0 AND (q.channel='email' OR (q.channel='whatsapp' AND json_extract(CASE WHEN json_valid(q.payload) THEN q.payload ELSE '{}' END,'$.template') IS NULL AND EXISTS(SELECT 1 FROM prospecting_conversations c WHERE c.owner=q.owner AND c.recipient=q.recipient AND c.paused=0 AND c.opted_out=0 AND c.last_real_inbound>? AND c.last_real_inbound<=?)))`:'';
  const candidates=await query(`SELECT q.key FROM prospecting_outbox q WHERE q.owner=? AND q.state IN ('pending','failed') AND q.attempts<3 AND q.next_attempt<=?${freeEligibility} ORDER BY q.created,q.key LIMIT ?`,owner,epoch,...(freeOnly?[new Date(epoch-86400000+120000).toISOString(),at]:[]),limit);
  const result={sent:0,simulated:0,blocked:0,failed:0,uncertain:0,auditPending:0};
  for(const {key} of candidates){
   const account=await store.requireAccount(owner),row=await store.outbox(owner,key);
   if(account.killSwitch||(!account.dryRun&&(!liveNetworkApproved||!realSource(row)))){result.blocked++;continue;}
   let conversation=null;
   if(row.channel==='whatsapp'){const policy=await whatsappPolicy(row,account);conversation=policy.conversation;if(policy.decision!=='allowed'||!replyApproved(row,account)){result.blocked++;continue;}}
   else if(!account.config.ownerEmailVerified||account.config.ownerEmail!==row.recipient){result.blocked++;continue;}
   const token=crypto.randomUUID();let locked=false,dispatched=false;
   if(row.channel==='whatsapp'){locked=await store.claimConversation(owner,row.recipient,token,now());if(!locked){result.blocked++;continue;}}
   try{
    const claimed=await store.claimOutbox(owner,key,token,now());if(!claimed)continue;
    if(!await store.outboxLeaseCurrent(owner,key,token,now()))throw new Error('send_lease_lost');
    const current=await store.requireAccount(owner);if(current.killSwitch||current.dryRun!==account.dryRun||current.revision!==account.revision)throw new Error('account_changed');
    if(row.channel==='whatsapp'&&(await whatsappPolicy(row,current)).decision!=='allowed')throw new Error('messaging_policy_changed');
    if(row.payload?.kind==='approved_pix'&&typeof beforeSend!=='function')throw new Error('pix_gate_unconfigured');
    let providerId=null;
    if(current.dryRun){if(beforeSend&&await beforeSend({row:claimed,account:current,conversation,now:now()})===false)throw new Error('before_send_denied');providerId='simulated:'+await stableId(owner,'preview',key);if(!await store.outboxLeaseCurrent(owner,key,token,now()))throw new Error('send_lease_lost');if(await store.finishOutbox(owner,key,token,{state:'simulated',providerId},now()))result.simulated++;else{result.blocked++;continue;}}
    else{
     // First-outreach reservation is never used for service replies. Uncertain reservations remain consumed.
     if(row.channel==='whatsapp'&&row.payload?.proactive===true){const p=await whatsappPolicy(row,current);const reserve=await prospecting.reserve({account:current.account,phone:row.recipient,attemptKey:key,now:now(),killSwitch:current.killSwitch,quality:current.config.waQuality,calendar:current.config.calendar,consent:await store.consent(owner,row.recipient),optOut:p.conversation.optedOut,paused:p.conversation.paused,lastInbound:p.conversation.lastInbound,proactive:true,templateApproved:true});if(!reserve.ok)throw new Error('outreach_reservation_denied');}
     if(!await store.outboxLeaseCurrent(owner,key,token,now()))throw new Error('send_lease_lost');
     if(beforeSend&&await beforeSend({row:claimed,account:current,conversation,now:now()})===false)throw new Error('before_send_denied');
     let dispatch;
     if(row.channel==='whatsapp'){if(!whatsapp?.send)throw new Error('whatsapp_provider_unconfigured');if((await whatsappPolicy(row,current)).decision!=='allowed')throw new Error('messaging_policy_changed');dispatch=()=>whatsapp.send({recipient:row.recipient,text:row.payload.text,template:row.payload.template,policyDecision:'allowed'});}
     else{if(!email?.send)throw new Error('email_provider_unconfigured');const idempotencyKey=await stableId(owner,'email',key);dispatch=()=>email.send({to:row.recipient,subject:row.payload.subject,text:row.payload.text,idempotencyKey});}
     if(!await store.beginOutboxDispatch(owner,key,token,{accountRevision:current.revision},now()))throw new Error('send_lease_lost');
     dispatched=true;const receipt=await dispatch();
     if(receipt?.status!=='accepted'||typeof receipt.providerId!=='string')throw Object.assign(new Error('provider_receipt_invalid'),{uncertain:true});
     providerId=receipt.providerId;
     const committed=await store.finishOutbox(owner,key,token,{state:'sent',providerId:receipt.providerId},now());
     if(committed)result.sent++;else{await store.recordAcceptedReceipt(owner,key,{providerId:receipt.providerId},now());result.uncertain++;}
    }
    const opportunityId=row.payload?.opportunityId||conversation?.opportunityId;
    if(opportunityId){try{await db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) SELECT ?,owner,id,?,?,? FROM commercial_opportunities WHERE owner=? AND id=? ON CONFLICT(id) DO NOTHING').bind(await stableId(owner,'outbound-acceptance',key),current.dryRun?'Simulação de envio comercial':row.channel==='email'?'E-mail aceito pelo provedor':'Mensagem aceita pelo provedor',JSON.stringify({kind:'automation_outbound',mode:current.dryRun?'simulated':'accepted',channel:row.channel,providerId}),now(),owner,opportunityId).run();}catch{result.auditPending++;}}
    if(row.payload?.pauseAfterSend)await store.takeover(owner,row.recipient,'owner',now());
   }catch(e){
    if(dispatched&&['provider_free_quota_exhausted','provider_quota_unavailable','provider_free_plan_unverified','free_service_window_required','provider_disabled'].includes(e?.code)){
     if(await store.deferUnsentFreeOutbox(owner,key,token,e.code,now())){result.blocked++;continue;}
    }
    const state=dispatched&&e?.uncertain?'uncertain':e?.retryable?'failed':'dlq',finished=await store.finishOutbox(owner,key,token,{state,errorCode:safeCode(e)},now());if(!finished)result.blocked++;else if(state==='uncertain')result.uncertain++;else result.failed++;
   }finally{if(locked)await store.releaseConversation(owner,row.recipient,token);}
  }return result;
 }
 return {store,receiveNormalizedEvents,processInbox,flushOutbox,reconcileHandoffs};
}
