// Offline event reducer. CRM/financial records are authoritative and are never mutated here.
export const STAGES=['pesquisado','qualificado','contato_whatsapp_autorizado','conversa_ativa','interesse_explicito','briefing_recebido','escopo_condicoes_aprovados_humano','aceite_registrado','pix_200_enviado','sinal_confirmado_financeiro','contrato_validado','producao','entrega_validada','saldo_300_cobrado','saldo_confirmado'];
export function applyCommercialEvent(state,event){
 if(!event?.id||!event?.at||!Number.isFinite(Date.parse(event.at)))throw new Error('invalid_event');
 if((state.events||[]).some(e=>e.id===event.id))return state;
 const next=structuredClone(state);next.events||=[];
 if(event.type==='human_takeover'){if(event.actor!=='owner')throw new Error('human_required');next.paused=true;}
 else if(event.type==='bot_resume'){if(event.actor!=='owner')throw new Error('human_required');next.paused=false;}
 else if(event.type==='opt_out'){next.optOut=true;next.paused=true;}
 else if(STAGES.includes(event.type)){
  if(state.optOut)throw new Error('opt_out');
  const current=STAGES.indexOf(state.stage),target=STAGES.indexOf(event.type);
  if(target!==current+1)throw new Error('invalid_transition');
  if(!event.evidenceRef)throw new Error('evidence_required');
  if(['escopo_condicoes_aprovados_humano','producao','entrega_validada'].includes(event.type)&&event.actor!=='owner')throw new Error('human_required');
  if(['sinal_confirmado_financeiro','saldo_confirmado'].includes(event.type)&&(!['owner','finance'].includes(event.actor)||event.source!=='crm_financial_confirmation'))throw new Error('financial_confirmation_required');
  if(event.type==='contrato_validado'&&(event.actor!=='owner'||event.source!=='crm_contract'))throw new Error('contract_validation_required');
  next.stage=event.type;
 }else throw new Error('invalid_event_type');
 next.events.push(structuredClone(event));return next;
}
