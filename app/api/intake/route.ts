import {publicSites,submitSite,recordEvent} from '../../../lib/forms-store';
import {submitPortfolio} from '../../../lib/portfolio-store';
import {authorizeIntake,readPublicForm,seedIntake,limitIntake,submitDiagnosis,captureInterest,startDiagnosis,recordDiagnosticIntent} from '../../../lib/intake-store';
export const dynamic='force-dynamic';
const reply=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(req:Request){try{const owner=await authorizeIntake(req),slug=new URL(req.url).searchParams.get('form');return reply(slug?await publicSites(owner,slug):{form:await readPublicForm(owner)});}catch(e:any){return reply({error:e.message},e.status||503);}}
export async function POST(req:Request){try{const owner=await authorizeIntake(req);if(Number(req.headers.get('content-length')||0)>20000)return reply({error:'Solicitação muito grande.'},413);const raw=await req.text();if(raw.length>20000)return reply({error:'Solicitação muito grande.'},413);let body;try{body=JSON.parse(raw);}catch{return reply({error:'Solicitação inválida.'},400);}
 if(body.action==='seed')return reply(await seedIntake(owner));
 if(body?.action==='portfolio_submit'){await limitIntake(owner,req,body.action);return reply(await submitPortfolio(owner,body));}
 if(body?.action==='portfolio_email_limit'){await limitIntake(owner,req,body.action);return reply({ok:true});}
 if(!['start','diagnose','capture','event','site_submit','intent'].includes(body.action))return reply({error:'Ação inválida.'},400);
 await limitIntake(owner,req,body.action);if(body.action==='intent')return reply(await recordDiagnosticIntent(owner,body));if(body.action==='event'){await recordEvent(owner,body);return reply({ok:true});}if(body.action==='site_submit')return reply(await submitSite(owner,body));return reply(body.action==='start'?await startDiagnosis(owner,body):body.action==='diagnose'?await submitDiagnosis(owner,body):await captureInterest(owner,body));
 }catch(e:any){return reply({error:e.status?e.message:'O serviço está temporariamente indisponível. Tente novamente.'},e.status||503);}}
