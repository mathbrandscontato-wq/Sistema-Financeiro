import {env} from 'cloudflare:workers';
import {recordAccessAction} from '../../../lib/access-audit';
import {workspaceAccess} from '../../../lib/access';
import {mutateFinance} from '../../../lib/finance-store';
import {readCommercial} from '../../../lib/commercial-store';
export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){const user=await workspaceAccess('finance.read');if(!user)return reply({error:'Autenticação necessária.'},401);try{const all=await readCommercial(user.userId),keys=['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments','commercial_quote_links','commercial_history','financial_history','financial_quote_receipts'],records=Object.fromEntries(keys.map(k=>[k,all[k]]));if(new URL(req.url).searchParams.get('download')==='1')return new Response(JSON.stringify({kind:'mathbrands-finance',records},null,2),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename=mathbrands-financeiro.json'}});return reply({records});}catch(e:any){return reply({error:e.message||'Financeiro indisponível.'},503);}}
export async function POST(req:Request){const user=await workspaceAccess('finance.write');if(!user)return reply({error:'Autenticação necessária.'},401);try{const raw=await req.text();if(raw.length>20000)return reply({error:'Solicitação muito grande.'},413);const body=JSON.parse(raw);await recordAccessAction(user,'finance:'+body.action);return reply(await mutateFinance(user.userId,body));}catch(e:any){return reply({error:e.message||'Não foi possível salvar.'},e.status||400);}}
