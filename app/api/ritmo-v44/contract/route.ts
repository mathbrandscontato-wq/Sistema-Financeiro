/**
 * V4.4: Consulta servidor-servidor de situação contratual do Financeiro.
 * Desligada por padrão. Não cria checkout, não move dinheiro nem confirma recibos.
 */
import {env} from 'cloudflare:workers';
import {verifyIncomingRequest,PROTOCOL_VERSION} from '../../../lib/ritmo-v44/protocol.mjs';
import {projectContractStatus} from '../../../lib/ritmo-v44/contract-status.mjs';
export const dynamic='force-dynamic';
const reply=(payload:any,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(req:Request){
 const runtime=env as unknown as {DB?:D1Database;INTAKE_OWNER?:string;RITMO_V44_ENABLED?:string;RITMO_V44_SECRET?:string;RITMO_V44_ORGANIZATION_ID?:string};
 if(runtime.RITMO_V44_ENABLED!=='true')return reply({error:'Indisponível'},404);
 if(!runtime.DB||!runtime.INTAKE_OWNER||!runtime.RITMO_V44_SECRET||!runtime.RITMO_V44_ORGANIZATION_ID)
  return reply({error:'Integração indisponível'},503);
 const url=new URL(req.url);
 if(url.searchParams.get('v')!==PROTOCOL_VERSION||url.searchParams.get('organizationId')!==runtime.RITMO_V44_ORGANIZATION_ID)
  return reply({error:'Integração inválida'},403);
 if(!await verifyIncomingRequest(req,runtime.RITMO_V44_SECRET))
  return reply({error:'Assinatura inválida'},401);
 const contractId=url.searchParams.get('contractId');
 if(typeof contractId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(contractId))
  return reply({error:'Contrato inválido'},400);
 try{
  const contract=await runtime.DB.prepare('SELECT * FROM commercial_contracts WHERE id=? AND owner=?').bind(contractId,runtime.INTAKE_OWNER).first<any>();
  if(!contract)return reply({error:'Contrato não encontrado'},404);
  const opportunity=await runtime.DB.prepare('SELECT * FROM commercial_opportunities WHERE id=? AND owner=?').bind(contract.opportunity_id,runtime.INTAKE_OWNER).first<any>();
  if(!opportunity)return reply({error:'Contratação inconsistente'},409);
  const payments=await runtime.DB.prepare('SELECT id,owner,contract_id,amount_cents,confirmation,reversed_on,kind,created,paid_on FROM commercial_payments WHERE contract_id=? AND owner=?')
   .bind(contract.id,runtime.INTAKE_OWNER).all<any>();
  return reply({protocolVersion:PROTOCOL_VERSION,organizationId:runtime.RITMO_V44_ORGANIZATION_ID,
    contract:projectContractStatus(contract,opportunity,payments.results)});
 }catch(e){console.error('ritmo-v44-contract',e);return reply({error:'Consulta temporariamente indisponível'},503)}
}
