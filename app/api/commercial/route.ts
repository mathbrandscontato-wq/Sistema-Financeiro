import {recordAccessAction} from '../../../lib/access-audit';
import {filterCRM} from '../../../lib/team-rules.mjs';
import {env} from 'cloudflare:workers';
import {mutateCRM,CRM_ACTIONS} from '../../../lib/crm-store';
import {reviewLead} from '../../../lib/markteam-store';
import {workspaceAccess} from '../../../lib/access';
import {readCommercial,importReference,referenceOverview,linkQuote} from '../../../lib/commercial-store';
export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 const user=await workspaceAccess('crm.read');if(!user)return reply({error:'Autenticação necessária.'},401);
 try{const records=filterCRM(await readCommercial(user.userId),user.role);if(new URL(req.url).searchParams.get('download')==='1')return new Response(JSON.stringify({schemaVersion:1,kind:'mathbrands-commercial-records',exportedAt:new Date().toISOString(),records},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="mathbrands-historico-comercial.json"','Cache-Control':'no-store'}});return reply({records,reference:referenceOverview(),team:[...(user.role==='owner'?[{email:user.email}]:[]),...(await env.DB!.prepare('SELECT email FROM workspace_members WHERE owner=? AND active=1 AND role=?').bind(user.userId,'commercial').all()).results],publicIntakeUrl:env.INTAKE_PUBLIC_URL||null});}catch(e:any){return reply({error:e.message||'Não foi possível carregar o histórico.'},503);}
}
export async function POST(req:Request){
 const user=await workspaceAccess('crm.write');if(!user)return reply({error:'Autenticação necessária.'},401);
 try{const raw=await req.text();if(raw.length>20000)return reply({error:'Solicitação muito grande.'},413);const body=JSON.parse(raw);await recordAccessAction(user,'commercial:'+body.action);if(user.role!=='owner'&&!await workspaceAccess('crm.write'))return reply({error:'Acesso não autorizado.'},403);
 if(body.action==='import_reference'){if(user.role!=='owner')return reply({error:'Importação restrita ao proprietário.'},403);const result=await importReference(user.userId);return reply(result,result.applied||result.reused?200:409);}
 if(body.opportunity?.assigneeEmail){const member=await env.DB!.prepare('SELECT id FROM workspace_members WHERE owner=? AND email=? AND active=1 AND role=?').bind(user.userId,body.opportunity.assigneeEmail.toLowerCase(),'commercial').first();if(!member&&!(user.role==='owner'&&body.opportunity.assigneeEmail.toLowerCase()===user.email.toLowerCase())){const prior=body.action==='save_opportunity'?await env.DB!.prepare('SELECT assignee_email FROM commercial_opportunities WHERE owner=? AND id=?').bind(user.userId,body.id).first<any>():null;if(prior?.assignee_email!==body.opportunity.assigneeEmail.toLowerCase())return reply({error:'Selecione um responsável comercial ativo.'},400);}}
 if(body.action==='markteam_review')return reply(await reviewLead(user.userId,user.actorId,body));
 if(CRM_ACTIONS.includes(body.action))return reply(await mutateCRM(user.userId,body));
 if(body.action==='link_quote')return reply(await linkQuote(user.userId,body.opportunityId,body.quoteId));
 return reply({error:'Ação inválida.'},400);
 }catch(e:any){return reply({error:e.message||'A operação não foi realizada.'},e.status||400);}
}
