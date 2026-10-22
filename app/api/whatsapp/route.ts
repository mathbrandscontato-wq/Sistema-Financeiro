import {env} from 'cloudflare:workers';
import {receiveWhatsApp} from '../../../lib/prospecting/server.mjs';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>receiveWhatsApp(req,env);
export const POST=(req:Request)=>receiveWhatsApp(req,env);
