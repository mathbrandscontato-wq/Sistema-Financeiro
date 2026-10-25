import {errorDetails} from '../../../lib/error-info.mjs';
import {workspaceAccess} from '../../../lib/access';
import {analyticsData,seatMutation} from '../../../lib/forms-store';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){const user=await workspaceAccess('acquisition.read');if(!user)return reply({error:'Acesso não autorizado.'},403);try{return reply(await analyticsData(user.userId,Object.fromEntries(new URL(req.url).searchParams),user.role));}catch(caught){const e=errorDetails(caught);return reply({error:e.status?e.message:'Não foi possível carregar Analytics.'},e.status||503);}}
export async function POST(req:Request){const user=await workspaceAccess('team.manage');if(!user)return reply({error:'Acesso não autorizado.'},403);try{if(new URL(req.url).origin!==req.headers.get('origin'))return reply({error:'Origem inválida.'},403);const raw=await req.text();if(raw.length>5000)return reply({error:'Corpo inválido.'},413);return reply(await seatMutation(user.userId,user.actorId,JSON.parse(raw)));}catch(caught){const e=errorDetails(caught);return reply({error:e.status?e.message:'Não foi possível alterar a oferta.'},e.status||503);}}
