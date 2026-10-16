import {env} from 'cloudflare:workers';
import {eventInput} from './forms.mjs';
import {validateAttribution} from './diagnostic.mjs';
import {stableId} from './commercial-import.mjs';
const now=()=>new Date().toISOString();
export async function recordEvent(owner:string,b:any,success=false){let v;if(success){if(b.analytics!==true||!/^[-a-zA-Z0-9]{10,100}$/.test(b.sessionKey||''))return;v={...b,event:'form_submit_success',eventId:'success-'+b.submissionId,device:['mobile','tablet','desktop'].includes(b.device)?b.device:'desktop',step:'complete'};}else v=eventInput(b);const a=validateAttribution(v.attribution),id=await stableId(owner,'analytics',success?v.eventId:v.formSlug+':'+v.eventId);await env.DB!.prepare('DELETE FROM acquisition_events WHERE owner=? AND created<?').bind(owner,new Date(Date.now()-180*86400000).toISOString()).run();await env.DB!.prepare('INSERT INTO acquisition_events(id,owner,form_slug,session_key,event,step,device,attribution,submission_id,created) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,v.formSlug,v.sessionKey,v.event,v.step,v.device,JSON.stringify(a),success?v.submissionId:null,now()).run();}
