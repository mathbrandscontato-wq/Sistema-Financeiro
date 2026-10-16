// Markteam: regras puras, sem dependências externas, sem envio de mensagens.
export const SCORE_DIMENSIONS = Object.freeze([
  ['role','Papel na decisão'],['need','Necessidade'],['timing','Momento de compra'],
  ['icp','Aderência ao ICP'],['deadline','Prazo'],['context','Contexto comercial']
]);
export const FOLLOW_UP_DAYS = Object.freeze([3,7,14]);
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
  const base=validDate(lead.captured)?lead.captured:localDate(lead.captured||lead.created);
  if(!base)return [];
  const holidays=options.holidays||[];
  return FOLLOW_UP_DAYS.map(days=>({days,date:addBusinessDays(base,days,holidays),label:'D+'+days}));
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
  if(missing.length)return {...empty,status:'incomplete'};
  const score=Math.round(keys.reduce((n,k)=>n+weights[k]*facts[k].value/5,0));
  return {status:'scored',score,classification:score>=thresholds.high?'Alta':score>=thresholds.medium?'Média':'Baixa',coverage,missing:[],explanation:'Pontuação baseada somente em avaliações e evidências explícitas.',evidence:dimensions.map(d=>({dimension:d.key,label:d.label,value:facts[d.key].value,weight:weights[d.key],evidence:facts[d.key].evidence.trim()}))};
}
