import {env} from 'cloudflare:workers';
import {workspaceAccess} from '../../../lib/access';
import {receivePaymentEvent,reviewPaymentEvent} from '../../../lib/payment-event-store';
export const dynamic='force-dynamic';
const reply=(d:any,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store'}});
export async function GET(){const u=await workspaceAccess('finance.read');if(!u)return reply({error:'Acesso não autorizado.'},403);const rows=await env.DB!.prepare('SELECT * FROM payment_event_inbox WHERE owner=? ORDER BY created DESC LIMIT 100').bind(u.userId).all();return reply({events:rows.results,enabled:!!env.PAYMENT_EVENTS_SECRET});}
export async function POST(req:Request){try{if(req.headers.has('Authorization'))return reply(await receivePaymentEvent(req));const u=await workspaceAccess('finance.write');if(!u)return reply({error:'Acesso não autorizado.'},403);const raw=await req.text();if(raw.length>4000)return reply({error:'Solicitação muito grande.'},413);return reply(await reviewPaymentEvent(u.userId,u.actorId,JSON.parse(raw)));}catch(e:any){return reply({error:e.status?e.message:'Não foi possível processar o evento.'},e.status||503);}}
