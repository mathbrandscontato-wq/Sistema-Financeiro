import {normalizeRecipient,pixEligibility} from './policy.mjs';
const ref=value=>{if(typeof value!=='string'||!value.trim()||value.length>300)throw new Error('approval_evidence_required');return value.trim();};
function fields(value){const out={};let i=0;while(i<value.length){const key=value.slice(i,i+2),size=Number(value.slice(i+2,i+4));if(!/^\d{2}$/.test(key)||!/^\d{2}$/.test(value.slice(i+2,i+4))||i+4+size>value.length||out[key]!==undefined)throw new Error('invalid_pix');out[key]=value.slice(i+4,i+4+size);i+=4+size;}return out;}
export function validateOfficialPix(payload,key){
 if(typeof payload!=='string'||payload.length>512||! /^[\x20-\x7E]+$/.test(payload)||payload.slice(-8,-4)!=='6304'||!key)throw new Error('official_pix_not_validated');
 const top=fields(payload),account=fields(top['26']||'');
 if(top['00']!=='01'||top['53']!=='986'||top['58']!=='BR'||account['00']!=='BR.GOV.BCB.PIX'||account['01']!==key||!top['59']||!top['60']||top['54']!=='200.00')throw new Error('official_pix_not_validated');
 let crc=65535;for(const byte of new TextEncoder().encode(payload.slice(0,-4))){crc^=byte<<8;for(let k=0;k<8;k++)crc=crc&32768?((crc<<1)^0x1021)&65535:(crc<<1)&65535;}
 if(crc.toString(16).toUpperCase().padStart(4,'0')!==payload.slice(-4).toUpperCase())throw new Error('official_pix_not_validated');return true;
}
export async function approveClosing(db,owner,actor,phone,input,now){
 if(actor!==owner||input.capacityApproved!==true||input.acceptanceReviewed!==true)throw new Error('human_approval_required');
 const recipient=normalizeRecipient(phone),approvalRef=ref(input.approvalRef),briefingRef=ref(input.briefingRef),pixRef=ref(input.pixRef),acceptanceEvent=ref(input.acceptanceEvent);
 const conversation=await db.prepare('SELECT opportunity_id,opted_out FROM prospecting_conversations WHERE owner=? AND recipient=?').bind(owner,recipient).first();
 if(!conversation?.opportunity_id||conversation.opted_out)throw new Error('conversation_not_eligible');
 const event=await db.prepare("SELECT event_id FROM prospecting_inbox WHERE owner=? AND recipient=? AND event_id=? AND kind='message' AND source_mode='real' AND simulated=0").bind(owner,recipient,acceptanceEvent).first();
 const opp=await db.prepare('SELECT id FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0').bind(owner,conversation.opportunity_id).first();
 if(!event||!opp)throw new Error('acceptance_evidence_not_found');
 await db.prepare(`INSERT INTO prospecting_approvals(owner,recipient,opportunity_id,approval_ref,approved_by,briefing_ref,acceptance_event,pix_ref,capacity,created,updated) VALUES(?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(owner,recipient) DO UPDATE SET opportunity_id=excluded.opportunity_id,approval_ref=excluded.approval_ref,approved_by=excluded.approved_by,briefing_ref=excluded.briefing_ref,acceptance_event=excluded.acceptance_event,pix_ref=excluded.pix_ref,capacity=1,revoked=0,updated=excluded.updated`).bind(owner,recipient,opp.id,approvalRef,actor,briefingRef,acceptanceEvent,pixRef,now,now).run();
 return {approved:true,approvalRef};
}
export async function approvedPixMessage(db,owner,phone,env){
 const recipient=normalizeRecipient(phone),a=await db.prepare('SELECT * FROM prospecting_approvals WHERE owner=? AND recipient=? AND revoked=0').bind(owner,recipient).first();
 if(!a||!pixEligibility({humanApproved:a.approved_by===owner,approvalRef:a.approval_ref,accepted:!!a.acceptance_event,acceptanceRef:a.acceptance_event,pixValidated:env.COMMERCIAL_PIX_VALIDATED==='true'&&env.COMMERCIAL_PIX_REFERENCE===a.pix_ref,pixRef:a.pix_ref,capacityApproved:a.capacity===1,briefingReceived:!!a.briefing_ref}))throw new Error('pix_gate_blocked');
 const conversation=await db.prepare('SELECT opportunity_id,opted_out FROM prospecting_conversations WHERE owner=? AND recipient=?').bind(owner,recipient).first();
 if(!conversation||conversation.opted_out||conversation.opportunity_id!==a.opportunity_id)throw new Error('pix_gate_blocked');
 const opportunity=await db.prepare('SELECT id FROM commercial_opportunities WHERE owner=? AND id=? AND archived=0').bind(owner,a.opportunity_id).first();
 const acceptance=await db.prepare("SELECT payload FROM prospecting_inbox WHERE owner=? AND recipient=? AND event_id=? AND kind='message' AND source_mode='real' AND simulated=0").bind(owner,recipient,a.acceptance_event).first();
 if(!opportunity||!acceptance)throw new Error('pix_gate_blocked');
 const evidence=JSON.parse(acceptance.payload);if(evidence.simulation===true||evidence.sourceMode==='simulation')throw new Error('pix_gate_blocked');
 validateOfficialPix(env.COMMERCIAL_PIX_PAYLOAD,env.COMMERCIAL_PIX_KEY);
 return {kind:'approved_pix',approvalRef:a.approval_ref,text:'Conforme as condições aprovadas e seu aceite, o sinal é de R$ 200. Segue o Pix oficial validado da Math Brands. A confirmação será feita após verificação financeira.\n'+env.COMMERCIAL_PIX_PAYLOAD};
}
