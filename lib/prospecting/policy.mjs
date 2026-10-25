import {whatsappURL} from '../leads.mjs';

export const OFFER = Object.freeze({version:'sites-2026-v7',totalCents:50000,depositCents:20000,balanceCents:30000});
export const SCORE_KEYS = ['digitalPresence','activity','standardFit','decisionMaker','timing'];
export function localClock(now){
 const d=new Date(now);if(!Number.isFinite(+d))throw new Error('invalid_time');
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
 const day=`${p.year}-${p.month}-${p.day}`;
 return {day,minutes:Number(p.hour)*60+Number(p.minute),weekday:new Date(day+'T12:00:00Z').getUTCDay()};
}
export function normalizeRecipient(phone){const url=whatsappURL(phone);if(!url)throw new Error('invalid_recipient');return url.slice('https://wa.me/'.length);}
export function grade(criteria,excluded=false){
 if(excluded)return {score:0,grade:'D'};
 if(!criteria||SCORE_KEYS.some(k=>!Number.isInteger(criteria[k])||criteria[k]<0||criteria[k]>2))throw new Error('invalid_score');
 const score=SCORE_KEYS.reduce((s,k)=>s+criteria[k],0);return {score,grade:score>=8?'A':score>=5?'B':'C'};
}
export function researchDue(now){return localClock(now).minutes>=630;}
// An explicitly reviewed calendar is mandatory. Missing holiday data fails closed.
export function contactPolicy({now,consent,optOut=false,paused=false,quality='unknown',calendar,lastInbound,templateApproved=false,proactive=true,killSwitch=true}){
 if(killSwitch)return 'disabled';if(optOut)return 'opt_out';if(paused)return 'human_takeover';if(quality!=='healthy')return 'quality_unverified';
 const t=localClock(now),inbound=Date.parse(lastInbound),elapsed=Date.parse(now)-inbound;
 const windowOpen=Number.isFinite(elapsed)&&elapsed>=0&&elapsed<86400000;
 if(proactive){
  const granted=Date.parse(consent?.grantedAt),expires=consent?.expiresAt?Date.parse(consent.expiresAt):Infinity;
  if(consent?.channel!=='whatsapp'||consent?.brand!=='Math Brands'||consent?.purpose!=='sites'||!consent?.evidence||!Number.isFinite(granted)||granted>Date.parse(now)||! (expires>Date.parse(now))||consent.revokedAt)return 'no_optin';
  if(!calendar?.reviewedThrough||calendar.reviewedThrough<t.day||!Array.isArray(calendar.holidays))return 'calendar_unverified';
  if([0,6].includes(t.weekday)||calendar.holidays.includes(t.day)||t.minutes<540||t.minutes>=1020)return 'outside_business_hours';
  if(!templateApproved)return 'template_required';
 }else if(!windowOpen)return 'service_window_closed';
 return 'allowed';
}
export function followupDays({lastContact,permission=false,replied=false,optOut=false,agreedDay,calendar}){
 if(!permission||replied||optOut)return [];
 if(!calendar?.reviewedThrough||!Array.isArray(calendar.holidays))return [];
 const start=localClock(lastContact).day;
 const business=d=>![0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())&&!calendar.holidays.includes(d);
 if(agreedDay)return agreedDay>start&&agreedDay<=calendar.reviewedThrough&&business(agreedDay)?[agreedDay]:[];
 let d=new Date(start+'T12:00:00Z'),count=0,out=[];
 for(let i=0;i<60&&count<10;i++){d.setUTCDate(d.getUTCDate()+1);const day=d.toISOString().slice(0,10);if(day>calendar.reviewedThrough)return [];if(business(day)){count++;if([2,5,10].includes(count))out.push(day);}}
 return out;
}

const CONDITIONS='Para projetos aceitos na modalidade padrão, o valor é R$ 500: R$ 200 de sinal após avaliação da Math Brands e aceite, e R$ 300 na entrega validada. Domínio é pago à parte, inclusive eventual renovação. A hospedagem pode ser gratuita conforme a solução aprovada.';
const ESCALATE='Essa possibilidade depende da avaliação da Math Brands. Prefiro não prometer funcionalidades ou prazo antes de verificarmos a viabilidade e as condições.';
// Deterministic offline dialogue: no LLM call, tool execution or financial mutation.
export function consult(message,{paused=false}={}){
 if(paused)return {reply:null,event:'bot_pausado'};
 const s=String(message).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const intro='Sou a assistente virtual da Math Brands. ';
 if(/nao (quero|mande|envie|me procure|tenho interesse)|remova meu numero|cancele (as )?mensagens|cancelar mensagens|\b(pare|sair|stop|unsubscribe)\b/.test(s))return {reply:intro+'Vou encerrar os contatos comerciais.',event:'opt_out'};
 if(/humano|matheus|responsavel|atendente/.test(s))return {reply:intro+'Vou encaminhar seu pedido ao responsável.',event:'handoff_requested'};
 if(/comprovante|ja paguei|fiz o pix/.test(s))return {reply:intro+'A confirmação depende da verificação financeira pela Math Brands.',event:'financial_review'};
 if(/pagina|integr|e.?commerce|checkout|login|agenda|sistema|prazo|tecnologia|seo|ignore|instruc|prompt/.test(s))return {reply:intro+ESCALATE,event:'technical_review'};
 if(/quero contratar|vamos fechar|quero fechar|quero comprar/.test(s))return {reply:intro+'Vou avisar o responsável sobre seu interesse. O briefing está em https://projeto.mathbrands.com.br/. As condições e a disponibilidade serão avaliadas antes de qualquer Pix.',event:'interesse_explicito'};
 if(/preco|valor|custa|pix|dominio|hospedagem|desconto|parcel/.test(s))return {reply:intro+CONDITIONS,event:'conditions'};
 if(/instagram|ja tenho site/.test(s))return {reply:intro+'Um endereço próprio pode ajudar a apresentar seu negócio com clareza. O que você gostaria de melhorar na sua comunicação hoje?',event:'objection'};
 if(/caro/.test(s))return {reply:intro+'O que pesa mais: o investimento agora ou a dúvida sobre o valor para o seu negócio?',event:'objection'};
 if(/pensar|depois|agora nao/.test(s))return {reply:intro+'Tudo bem. Existe uma data em que você gostaria de retomar?',event:'return_requested'};
 if(/briefing|formulario|cadastro/.test(s))return {reply:intro+'O briefing está em https://projeto.mathbrands.com.br/. O envio passa por avaliação da Math Brands e não garante contratação.',event:'briefing_link'};
 return {reply:intro+'Qual é o principal objetivo de comunicação do seu negócio hoje?',event:'discovery'};
}
export function pixEligibility({humanApproved,approvalRef,accepted,acceptanceRef,pixValidated,pixRef,capacityApproved,briefingReceived}){
 return humanApproved===true&&!!approvalRef&&accepted===true&&!!acceptanceRef&&pixValidated===true&&!!pixRef&&capacityApproved===true&&briefingReceived===true;
}
