// Markteam: regras puras, sem dependências externas, sem envio de mensagens.
export const SCORE_DIMENSIONS = Object.freeze([
  ['role','Papel na decisão'],['need','Necessidade'],['timing','Momento de compra'],
  ['icp','Aderência ao ICP'],['deadline','Prazo'],['context','Contexto comercial']
]);
export const FOLLOW_UP_DAYS = Object.freeze([3,7,14]);
export const ICP_PRIORITIES = Object.freeze([
  {id:'A',label:'Central',description:'Serviços especializados B2B e empresas em crescimento com necessidade de maturidade na comunicação.'},
  {id:'B',label:'Complementar',description:'Marcas autorais e especialistas buscando diferenciação e consistência.'},
  {id:'C',label:'Seletivo',description:'Negócios em lançamento com orçamento e escopo compatíveis.'}
]);
const CLOSED = new Set(['Fechado','Recusado']);
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const localDate = value => {
  if(typeof value!=='string' || Number.isNaN(Date.parse(value)))return null;
  const iso = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  return validDate(iso)?iso:null;
};
export function addBusinessDays(day,days,holidays=[]){
  if(!validDate(day)||!Number.isSafeInteger(days)||days<0||days>365)throw Error('Data ou quantidade de dias úteis inválida.');
  if(!Array.isArray(holidays)||holidays.some(h=>!validDate(h)))throw Error('Feriados inválidos.');
  const ignored=new Set(holidays),d=new Date(day+'T12:00:00Z');
  for(let n=0;n<days;){d.setUTCDate(d.getUTCDate()+1);const today=d.toISOString().slice(0,10);if(d.getUTCDay()!==0&&d.getUTCDay()!==6&&!ignored.has(today))n++;}
  return d.toISOString().slice(0,10);
}
export function followUpChoices(lead,options={}){
  if(!lead||lead.archived||CLOSED.has(lead.stage)||lead.next_action_on)return [];
  const holidays=options.holidays||[];
  const today=options.today===undefined?localDate(new Date().toISOString()):options.today;
  if(!validDate(today))throw Error('Data de referência inválida.');
  const mark=choice=>({...choice,overdue:choice.date<today});
  if(lead.stage==='Novo lead'){
    const captured=validDate(lead.captured)?lead.captured:localDate(lead.captured||lead.created);
    return captured?[mark({kind:'triage',days:1,date:addBusinessDays(captured,1,holidays),label:'Triagem'})]:[];
  }
  // Só sugerir uma cadência de proposta quando houver data comprovada de envio.
  if(!['Proposta enviada','Aguardando resposta'].includes(lead.stage)||lead.proposalFollowUpEligible!==true)return [];
  const sent=validDate(lead.proposalSentAt)?lead.proposalSentAt:localDate(lead.proposalSentAt);
  return sent?FOLLOW_UP_DAYS.map(days=>mark({kind:'proposal',days,date:addBusinessDays(sent,days,holidays),label:'D+'+days})):[];

}
// Uma pontuação só existe após definição explícita dos pesos, limites e evidências.
export function scoreLead(facts={},configuration=null){
  const dimensions=SCORE_DIMENSIONS.map(([key,label])=>({key,label}));
  const missing=dimensions.filter(d=>!facts||!facts[d.key]||!Number.isInteger(facts[d.key].value)||facts[d.key].value<0||facts[d.key].value>5||typeof facts[d.key].evidence!=='string'||!facts[d.key].evidence.trim()||facts[d.key].evidence.length>500).map(d=>d.key);
  const coverage=Math.round((dimensions.length-missing.length)*100/dimensions.length);
  const empty={score:null,classification:null,coverage,missing,explanation:'Sem inferência de informações ausentes.'};
  if(!configuration||!configuration.weights||!configuration.thresholds)return {...empty,status:'not_configured'};
  const weights=configuration.weights,thresholds=configuration.thresholds,keys=dimensions.map(d=>d.key);
  if(Object.keys(weights).sort().join(',')!==keys.slice().sort().join(',')||keys.some(k=>!Number.isInteger(weights[k])||weights[k]<0)||keys.reduce((n,k)=>n+weights[k],0)!==100||!Number.isInteger(thresholds.high)||!Number.isInteger(thresholds.medium)||thresholds.medium<0||thresholds.high>100||thresholds.high<=thresholds.medium)throw Error('Configuração de scoring inválida.');
  if(missing.length)return {...empty,status:'incomplete',classification:'Investigação'};
  const score=Math.round(keys.reduce((n,k)=>n+weights[k]*facts[k].value/5,0));
  return {status:'scored',score,classification:facts.icp.outOfProfile===true?'Fora do perfil prioritário':score>=thresholds.high?'Alta prioridade':score>=thresholds.medium?'Média prioridade':'Investigação',coverage,missing:[],explanation:'Pontuação baseada somente em avaliações e evidências explícitas.',evidence:dimensions.map(d=>({dimension:d.key,label:d.label,value:facts[d.key].value,weight:weights[d.key],evidence:facts[d.key].evidence.trim()}))};
}

export const QUALIFICATION_LEVELS = Object.freeze(['Alta prioridade','Média prioridade','Investigação','Fora do perfil prioritário']);
export const QUALIFICATION_TIERS = Object.freeze(['A','B','C','unknown']);
// Classificação humana explícita: sem IA, probabilidades ou notas automáticas.
export function validateManualQualification(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Classificação inválida.');
  const classification=input.classification,icpTier=input.icpTier;
  const explanation=typeof input.explanation==='string'?input.explanation.trim():'';
  const evidence=typeof input.evidence==='string'?input.evidence.trim():'';
  if(!QUALIFICATION_LEVELS.includes(classification)||!QUALIFICATION_TIERS.includes(icpTier))throw Error('Selecione prioridade e perfil válidos.');
  if(explanation.length<12||explanation.length>1000||evidence.length<5||evidence.length>1000)throw Error('Informe justificativa e evidência verificável (até 1.000 caracteres).');
  if(icpTier==='unknown'&&classification!=='Investigação')throw Error('Sem avaliação do perfil, mantenha o lead em investigação.');
  return {classification,icpTier,explanation,evidence};
}
