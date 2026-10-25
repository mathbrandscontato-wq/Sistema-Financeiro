import {env} from 'cloudflare:workers';
import {after} from 'next/server';
import {createProtectionSnapshot} from '../../../lib/protection';
import {receiveWhatsApp,processCommercialQueues} from '../../../lib/prospecting/server.mjs';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>receiveWhatsApp(req,env);
export const POST=(req:Request)=>receiveWhatsApp(req,env,{onAccepted:()=>{
 // The signed event is already persisted. Keep the webhook response prompt while
 // the platform holds the queue processor alive after the response finishes.
 after(async()=>{
  await processCommercialQueues(env,{beforeWrite:async()=>{
   const owner=env.COMMERCIAL_OWNER||env.INTAKE_OWNER;
   if(!owner)throw new Error('commercial_owner_unconfigured');
   await createProtectionSnapshot(owner,'Antes de processar atendimento recebido no WhatsApp');
  }});
 });
}});
