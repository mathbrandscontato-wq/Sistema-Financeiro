import {recordEvent} from './form-events';
import {env} from 'cloudflare:workers';
import {CRMError,validateMutationId} from './crm.mjs';
import {FORM,diagnose,validateAnswers,validateAttribution,validateContact,matchContact} from './diagnostic.mjs';
import {planCapture,contactKeys} from './intake-plan.mjs';
import {stableId} from './commercial-import.mjs';
import {sha256,createProtectionSnapshot} from './protection';
const hash=(s:string)=>sha256(new TextEncoder().encode(s));
export async function authorizeIntake(req:Request){if(!env.INTAKE_SHARED_SECRET||!env.INTAKE_OWNER)throw new CRMError('Diagnóstico temporariamente indisponível.',503);const provided=req.headers.get('X-Math-Intake-Key')||'';if(!provided||await hash(provided)!==await hash(env.INTAKE_SHARED_SECRET))throw new CRMError('Acesso não autorizado.',401);return env.INTAKE_OWNER;}
export async function seedIntake(owner:string){const id=await stableId(owner,'intake-form',FORM.slug+':'+FORM.version),db=env.DB!;const found=await db.prepare('SELECT * FROM intake_forms WHERE id=? AND owner=?').bind(id,owner).first();if(found)return {ok:true};await createProtectionSnapshot(owner,'Antes de publicar o diagnóstico de identidade visual');await db.prepare('INSERT INTO intake_forms(id,owner,slug,version,definition,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,FORM.slug,FORM.version,JSON.stringify(FORM),new Date().toISOString()).run();return {ok:true};}
export async function readPublicForm(owner:string){const row=await env.DB!.prepare('SELECT definition FROM intake_forms WHERE owner=? AND slug=? AND version=? AND published=1').bind(owner,FORM.slug,FORM.version).first<any>();if(!row)throw new CRMError('Diagnóstico indisponível.',503);return JSON.parse(row.definition);}
export async function limitIntake(owner:string,req:Request,action:string){const key=req.headers.get('X-Math-Abuse-Key')||'';if(!/^[a-f0-9]{64}$/.test(key))throw new CRMError('Solicitação inválida.',400);const now=Date.now(),hour=Math.floor(now/3600000),id=await stableId(owner,'intake-limit',action+':'+hour+':'+key);const result=await env.DB!.prepare('INSERT INTO intake_rate_limits(id,owner,count,expires) VALUES(?,?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,owner,new Date((hour+1)*3600000).toISOString()).first<any>();if(result.count>(action==='event'?600:action==='start'?60:action==='diagnose'?30:20))throw new CRMError('Muitas solicitações. Tente novamente mais tarde.',429);await env.DB!.prepare('DELETE FROM intake_rate_limits WHERE owner=? AND expires<?').bind(owner,new Date(now-3600000).toISOString()).run();}
export async function startDiagnosis(owner:string,body:any){
 validateMutationId(body.requestId);if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||body.website)throw new CRMError('Sessão inválida.');
 const id=await stableId(owner,'intake-session',body.requestId),tokenHash=await hash(body.token),a=JSON.stringify(validateAttribution(body.attribution)),now=new Date().toISOString();
 await env.DB!.prepare('INSERT INTO intake_acquisition(id,owner,token_hash,attribution,started_on,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET started_on=COALESCE(intake_acquisition.started_on,excluded.started_on) WHERE intake_acquisition.owner=excluded.owner AND intake_acquisition.token_hash=excluded.token_hash AND intake_acquisition.attribution=excluded.attribution').bind(id,owner,tokenHash,a,now,now).run();
 const found=await env.DB!.prepare('SELECT token_hash,attribution FROM intake_acquisition WHERE id=? AND owner=?').bind(id,owner).first<any>();if(!found||found.token_hash!==tokenHash||found.attribution!==a)throw new CRMError('Sessão já iniciada com outros dados.',409);return {ok:true};
}
export async function submitDiagnosis(owner:string,body:any){
 validateMutationId(body.requestId);if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))throw new CRMError('Sessão inválida.');if(body.website)throw new CRMError('Solicitação inválida.');
 const answers=validateAnswers(body.answers),diagnosis=diagnose(answers),attribution=validateAttribution(body.attribution),tokenHash=await hash(body.token),id=await stableId(owner,'intake-session',body.requestId),now=new Date().toISOString(),expires=new Date(Date.now()+14*86400000).toISOString();
 const tracking=await env.DB!.prepare('SELECT token_hash FROM intake_acquisition WHERE id=? AND owner=?').bind(id,owner).first<any>();if(tracking&&tracking.token_hash!==tokenHash)throw new CRMError('Sessão inválida.',409);
 const existing=await env.DB!.prepare('SELECT * FROM intake_sessions WHERE id=? AND owner=?').bind(id,owner).first<any>();
 if(existing){if(existing.token_hash!==tokenHash||existing.answers!==JSON.stringify(answers)||existing.attribution!==JSON.stringify(attribution))throw new CRMError('Esta sessão já foi concluída com outras respostas.',409);if(existing.expires<now)throw new CRMError('Sessão expirada. Faça um novo diagnóstico.',410);return {diagnosis:JSON.parse(existing.diagnosis),sessionId:id};}
 const form=await env.DB!.prepare('SELECT id FROM intake_forms WHERE owner=? AND slug=? AND version=? AND published=1').bind(owner,FORM.slug,FORM.version).first<any>();if(!form)throw new CRMError('Diagnóstico indisponível.',503);
 await createProtectionSnapshot(owner,'Antes de salvar um diagnóstico sem contato');
 try{await env.DB!.batch([env.DB!.prepare('DELETE FROM intake_sessions WHERE owner=? AND expires<? AND NOT EXISTS(SELECT 1 FROM intake_captures WHERE session_id=intake_sessions.id)').bind(owner,now),env.DB!.prepare('INSERT INTO intake_sessions(id,owner,form_id,request_id,token_hash,answers,diagnosis,attribution,created,expires) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,owner,form.id,body.requestId,tokenHash,JSON.stringify(answers),JSON.stringify(diagnosis),JSON.stringify(attribution),now,expires),env.DB!.prepare('INSERT INTO intake_acquisition(id,owner,token_hash,attribution,diagnosed_on,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET diagnosed_on=excluded.diagnosed_on').bind(id,owner,tokenHash,JSON.stringify(attribution),now,now)]);}catch(e){const committed=await env.DB!.prepare('SELECT id FROM intake_sessions WHERE id=? AND owner=?').bind(id,owner).first();if(committed)return submitDiagnosis(owner,body);throw e;}
 return {diagnosis,sessionId:id};
}
export async function recordDiagnosticIntent(owner:string,body:any){
 if(!['quote','conversation'].includes(body.intent)||typeof body.sessionId!=='string'||body.sessionId.length>120||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||body.website)throw new CRMError('Solicitação inválida.');
 const db=env.DB!,session=await db.prepare('SELECT * FROM intake_sessions WHERE id=? AND owner=? AND token_hash=?').bind(body.sessionId,owner,await hash(body.token)).first<any>();
 if(!session)throw new CRMError('Diagnóstico não encontrado.',404);
 if(session.expires<new Date().toISOString())throw new CRMError('Sessão expirada. Faça um novo diagnóstico.',410);
 const capture=await db.prepare('SELECT opportunity_id FROM intake_captures WHERE session_id=? AND owner=?').bind(session.id,owner).first<any>();
 if(!capture)throw new CRMError('Conclua o diagnóstico antes de solicitar atendimento.',409);
 const id=await stableId(owner,'diagnostic-intent',session.id+':'+body.intent),now=new Date().toISOString();
 const label=body.intent==='quote'?'Orçamento solicitado pelo diagnóstico':'Conversa sobre diagnóstico solicitada';
 const action=body.intent==='quote'?'Confirmar escopo e preparar proposta solicitada':'Conversar sobre o diagnóstico e esclarecer dúvidas';
 await createProtectionSnapshot(owner,'Antes de registrar intenção comercial do diagnóstico');
 await db.batch([
  db.prepare("UPDATE commercial_opportunities SET intent=?,next_action=?,revision=revision+1,updated=? WHERE id=? AND owner=? AND archived=0 AND stage NOT IN ('Fechado','Recusado') AND NOT EXISTS(SELECT 1 FROM commercial_history WHERE id=? AND owner=?)").bind(label,action,now,capture.opportunity_id,owner,id,owner),
  db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,capture.opportunity_id,label,JSON.stringify({kind:'diagnostic_intent',intent:body.intent,sessionId:session.id,formId:session.form_id,approach:action}),now)
 ]);
 return {ok:true};
}
export async function captureInterest(owner:string,body:any){
 if(typeof body.sessionId!=='string'||body.sessionId.length>120||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||body.website)throw new CRMError('Solicitação inválida.');
 const db=env.DB!,session=await db.prepare('SELECT * FROM intake_sessions WHERE id=? AND owner=? AND token_hash=?').bind(body.sessionId,owner,await hash(body.token)).first<any>();if(!session)throw new CRMError('Diagnóstico não encontrado.',404);if(session.expires<new Date().toISOString())throw new CRMError('Sessão expirada. Faça um novo diagnóstico.',410);
 const contact=validateContact(body.contact),encoded=JSON.stringify(contact);
 for(let attempt=0;attempt<3;attempt++){
  const replay=await db.prepare('SELECT contact FROM intake_captures WHERE session_id=? AND owner=?').bind(session.id,owner).first<any>();if(replay){if(replay.contact!==encoded)throw new CRMError('O pedido já foi registrado com outros dados. Converse com a Math Brands para atualizar.',409);try{await recordEvent(owner,{...body,formSlug:'identidade-visual',submissionId:session.id},true);}catch{}return {ok:true,reused:true};}
  const clients=(await db.prepare('SELECT * FROM commercial_clients WHERE owner=?').bind(owner).all<any>()).results;let client=matchContact(clients,contact);
  const keys=await contactKeys(owner,contact),keyRows=(await db.prepare('SELECT * FROM intake_contact_keys WHERE owner=? AND key IN ('+keys.map(()=>'?').join(',')+')').bind(owner,...keys).all<any>()).results;
  const ids=new Set([...(client?[client.id]:[]),...keyRows.map(r=>r.client_id)]);if(ids.size>1)throw new CRMError('Os canais informados precisam de uma conferência pela Math Brands.',409);if(ids.size===1)client=clients.find(c=>c.id===[...ids][0])||null;
  const linked=client?await db.prepare('SELECT * FROM intake_lead_links WHERE owner=? AND client_id=? AND form_id=?').bind(owner,client.id,session.form_id).first<any>():null;
  const plan=await planCapture(owner,session,contact,client,linked,new Date().toISOString());await createProtectionSnapshot(owner,'Antes de registrar pedido de atendimento no CRM');
  try{await db.batch(plan.statements.map((s:any)=>db.prepare(s.sql).bind(...s.args)));try{await recordEvent(owner,{...body,formSlug:'identidade-visual',submissionId:session.id},true);}catch{}return {ok:true};}catch(e:any){if(!/unique|constraint/i.test(e.message||''))throw e;}
 }
 throw new CRMError('Não foi possível confirmar o pedido. Tente novamente.',409);
}
