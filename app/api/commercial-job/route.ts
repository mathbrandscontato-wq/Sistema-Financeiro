import {env} from 'cloudflare:workers';
import {runCommercialJob} from '../../../lib/prospecting/server.mjs';
import {createProtectionSnapshot} from '../../../lib/protection';
import markets from '../../../data/prospecting-markets.json';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{return await runCommercialJob(req,env,{markets,beforeWrite:async()=>{await createProtectionSnapshot(env.COMMERCIAL_OWNER||env.INTAKE_OWNER||'','Antes de atualizar atendimento comercial');}});}catch{return Response.json({error:'A execução não foi confirmada.'},{status:503});}}
