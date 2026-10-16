import {stableId} from './commercial-import.mjs';
import {planCreateOpportunity,CRMError} from './crm.mjs';
import {PRIVACY_VERSION,normalizeEmail,normalizePhone} from './diagnostic.mjs';
const st=(sql,...args)=>({sql,args});
export async function contactKeys(owner,c){const values=[c.email?'email:'+normalizeEmail(c.email):null,c.phone?'phone:'+normalizePhone(c.phone):null].filter(Boolean);return Promise.all(values.map(v=>stableId(owner,'intake-contact',v)));}
export async function planCapture(owner,session,contact,client,linked,now){
 if(session.owner!==owner)throw new CRMError('Diagnóstico não encontrado.',404);
 const keys=await contactKeys(owner,contact),newClient=!client;
 if(!client){const id=await stableId(owner,'intake-client',keys[0]);client={id,owner,revision:1,archived:0,created:now,updated:now};}
 if(client.owner!==owner||client.archived)throw new CRMError('Contato indisponível.',409);
 if(linked&&(linked.owner!==owner||linked.client_id!==client.id||linked.form_id!==session.form_id))throw new CRMError('Vínculo inválido.',409);
 const d=JSON.parse(session.diagnosis),attribution=JSON.parse(session.attribution),origin=attribution.utm_source||'Diagnóstico de identidade visual';
 const opportunityId=linked?.opportunity_id||await stableId(owner,'intake-opportunity',session.form_id+':'+client.id),captureId=await stableId(owner,'intake-capture',session.id),statements=[];
 if(newClient){statements.push(st('INSERT INTO commercial_clients(id,owner,identity_key,display_name,contact_name,origin,email,phone,instagram,brand_site,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',client.id,owner,'intake:'+keys[0],contact.display_name,contact.contact_name,origin,contact.email,contact.phone,contact.instagram,contact.brand_site,now,now));statements.push(st('INSERT INTO commercial_client_history(id,owner,client_id,action,data,created) VALUES(?,?,?,?,?,?)',await stableId(owner,'intake-client-created',client.id),owner,client.id,'Contato solicitado pelo visitante',JSON.stringify({kind:'intake_client_created',privacyVersion:PRIVACY_VERSION}),now));}
 for(const key of keys)statements.push(st('INSERT INTO intake_contact_keys(id,owner,key,client_id,created) VALUES(?,?,?,?,?) ON CONFLICT(owner,key) DO UPDATE SET client_id=CASE WHEN intake_contact_keys.client_id=excluded.client_id THEN intake_contact_keys.client_id ELSE NULL END',key,owner,key,client.id,now));
 if(!linked){const hex=opportunityId.slice(-64, -32),requestId=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');const plan=await planCreateOpportunity(owner,{clientId:client.id,title:d.path,amount:'',stage:'Novo lead',service:d.path,intent:d.intent,origin,nextAction:'Entrar em contato por '+contact.preference,notes:''},requestId,client,now);
 // Stable grouping ID belongs to the form/contact pair; reuse the normal CRM planner.
 const createdId=plan.id;statements.push(...plan.statements);
 statements.push(st('INSERT INTO intake_lead_links(id,owner,client_id,form_id,opportunity_id,created) VALUES(?,?,?,?,?,?)',await stableId(owner,'intake-link',session.form_id+':'+client.id),owner,client.id,session.form_id,createdId,now));linked={opportunity_id:createdId};}
 statements.push(st('INSERT INTO intake_captures(id,owner,session_id,client_id,opportunity_id,contact,privacy_version,marketing,created) VALUES(?,?,?,?,?,?,?,?,?)',captureId,owner,session.id,client.id,linked.opportunity_id,JSON.stringify(contact),PRIVACY_VERSION,contact.marketing?1:0,now));
 statements.push(st('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) VALUES(?,?,?,?,?,?)',await stableId(owner,'intake-history',session.id),owner,linked.opportunity_id,'Diagnóstico e pedido de atendimento recebidos',JSON.stringify({kind:'intake',sessionId:session.id,formId:session.form_id,answers:JSON.parse(session.answers),diagnosis:d,attribution,contact,privacyVersion:PRIVACY_VERSION}),now));
 statements.push(st('UPDATE intake_acquisition SET captured_on=?,opportunity_id=? WHERE id=? AND owner=?',now,linked.opportunity_id,session.id,owner));
 return {clientId:client.id,opportunityId:linked.opportunity_id,statements};
}
