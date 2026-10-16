export const FORM_NAMES={'identidade-visual':'Diagnóstico de Marca','sites-projeto-especial':'Sites · Projeto Especial','sites-orcamento':'Sites · Orçamento'};
export function safeJSON(value,fallback={}){try{return typeof value==='string'?JSON.parse(value):value||fallback;}catch{return fallback;}}
export const localDay=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):'';
export function whatsappURL(phone){if(typeof phone!=='string'||!/^[+\d\s().-]+$/.test(phone))return null;let digits=phone.replace(/\D/g,'');if(!phone.trim().startsWith('+')&&[10,11].includes(digits.length))digits='55'+digits;if(digits.startsWith('0')||digits.length<12||digits.length>15)return null;return 'https://wa.me/'+digits;}
export function emailURL(email){return typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'mailto:'+encodeURIComponent(email):null;}
// Somente histórico auditado comprova início de uma cadência após proposta.
export function proposalEvidence(events=[],opportunityId){
 const history=events.filter(e=>e.opportunity_id===opportunityId).sort((a,b)=>a.created.localeCompare(b.created)||String(a.id||'').localeCompare(String(b.id||'')));
 const proposals=history.filter(e=>{const d=safeJSON(e.data);return d?.after?.stage==='Proposta enviada'&&d?.before?.stage!=='Proposta enviada';});
 const sent=proposals.at(-1);
 if(!sent)return {proposalSentAt:null,proposalFollowUpEligible:false};
 // Qualquer registro posterior de contato/negociação suspende sugestões de follow-up.
 const newer=history.slice(history.indexOf(sent)+1).some(e=>{const d=safeJSON(e.data);return ['negotiation','intake'].includes(d.kind)||(d.kind==='opportunity_updated'&&['Negociação','Contato inicial','Fechado','Recusado'].includes(d.after?.stage));});
 return {proposalSentAt:sent.created,proposalFollowUpEligible:!newer};
}
export function reviewedQualification(events=[]){
 const reviews=events.filter(e=>safeJSON(e.data).kind==='markteam_qualification').sort((a,b)=>b.created.localeCompare(a.created)||String(b.id||'').localeCompare(String(a.id||'')));
 const last=reviews[0];if(!last)return null;
 const detail=safeJSON(last.data);return {...detail.qualification,reviewedAt:detail.reviewedAt||last.created,reviewedBy:detail.reviewedBy};
}
export function leadRows(records={}){
 const clients=new Map((records.commercial_clients||[]).map(c=>[c.id,c])),sessions=new Map((records.intake_sessions||[]).map(s=>[s.id,s])),forms=new Map((records.intake_forms||[]).map(f=>[f.id,f])),captures=new Map(),historyByOpportunity=new Map();
 for(const event of records.commercial_history||[]){if(!historyByOpportunity.has(event.opportunity_id))historyByOpportunity.set(event.opportunity_id,[]);historyByOpportunity.get(event.opportunity_id).push(event);}
 for(const c of [...(records.intake_captures||[])].sort((a,b)=>b.created.localeCompare(a.created))){if(!captures.has(c.opportunity_id))captures.set(c.opportunity_id,c);}
 return (records.commercial_opportunities||[]).map(o=>{const client=clients.get(o.client_id)||{},capture=captures.get(o.id),session=sessions.get(capture?.session_id),contact=safeJSON(capture?.contact),diagnosis=session?safeJSON(session.diagnosis):null,form=forms.get(session?.form_id),attribution=safeJSON(session?.attribution);return {...o,...proposalEvidence(historyByOpportunity.get(o.id)||[],o.id),qualification:reviewedQualification(historyByOpportunity.get(o.id)||[]),client,name:client.contact_name||contact.contact_name||client.display_name||contact.display_name||o.title,company:client.display_name||contact.display_name||'',phone:client.phone||contact.phone||null,email:client.email||contact.email||null,captured:capture?.created||o.created,hasCapture:Boolean(capture),source:FORM_NAMES[form?.slug]||o.origin||client.origin||'Não informada',channel:attribution.utm_source||null,diagnosis,contact,capture,session};}).sort((a,b)=>b.captured.localeCompare(a.captured));
}
export function filterLeads(rows,filters={}){const term=(filters.search||'').trim().toLocaleLowerCase('pt-BR'),digits=term.replace(/\D/g,'');return rows.filter(r=>(filters.archived==='all'||Boolean(r.archived)===(filters.archived==='archived'))&&(!filters.stage||r.stage===filters.stage)&&(!filters.priority||r.qualification?.classification===filters.priority||(filters.priority==='unreviewed'&&!r.qualification))&&(!filters.origin||r.source===filters.origin)&&(!filters.from||localDay(r.captured)>=filters.from)&&(!filters.to||localDay(r.captured)<=filters.to)&&(!term||[r.name,r.company,r.email,r.phone,r.title].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term)||(digits.length>2&&!/[a-z]/i.test(term)&&(r.phone||'').replace(/\D/g,'').includes(digits))));}
