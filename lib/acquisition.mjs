import {optionalDate,CRMError} from './crm.mjs';
const localDate=s=>s?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s)):null;
export function acquisitionMetrics(events,opportunities,filters={}){
 const from=optionalDate(filters.from),to=optionalDate(filters.to);if(from&&to&&from>to)throw new CRMError('Período inválido.');
 const include=d=>(!from||d>=from)&&(!to||d<=to);
 const selected=events.filter(e=>include(localDate(e.started_on||e.diagnosed_on||e.created)));
 const groups=new Map();const tally=(g,e)=>{g.starts+=e.started_on?1:0;g.results+=e.diagnosed_on?1:0;g.measuredResults+=e.started_on&&e.diagnosed_on?1:0;g.requests+=e.captured_on?1:0;if(e.opportunity_id)g.ids.add(e.opportunity_id);};
 const total={starts:0,measuredResults:0,results:0,requests:0,ids:new Set()};
 for(const e of selected){const a=JSON.parse(e.attribution||'{}'),key=JSON.stringify([a.utm_source||'Direto / sem UTM',a.utm_campaign||'Sem campanha',a.utm_content||'Sem conteúdo']);if(!groups.has(key))groups.set(key,{source:a.utm_source||'Direto / sem UTM',campaign:a.utm_campaign||'Sem campanha',content:a.utm_content||'Sem conteúdo',starts:0,measuredResults:0,results:0,requests:0,ids:new Set()});tally(groups.get(key),e);tally(total,e);}
 const finish=g=>{const deals=opportunities.filter(o=>g.ids.has(o.id));return {...g,ids:undefined,uniqueLeads:g.ids.size,won:deals.filter(o=>o.stage==='Fechado').length,lost:deals.filter(o=>o.stage==='Recusado').length,completion:g.starts?Math.round(100*g.measuredResults/g.starts):null,contactRate:g.results?Math.round(100*g.requests/g.results):null,unfinished:Math.max(0,g.starts-g.measuredResults)};};
 return {total:finish(total),groups:[...groups.values()].map(finish),filters:{from,to},notice:'Coorte pela data de início, ou resultado quando o início não foi medido. Pedidos repetidos são separados dos leads únicos. Ganhos e perdas mostram a etapa atual. Inícios sem resultado ainda podem ser concluídos; não são abandono confirmado.'};
}
