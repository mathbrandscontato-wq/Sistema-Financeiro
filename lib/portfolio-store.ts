import {env} from 'cloudflare:workers';
import {CRMError,validateMutationId} from './crm.mjs';
import {validateContact} from './diagnostic.mjs';
import {stableId} from './commercial-import.mjs';
import {sha256,createProtectionSnapshot} from './protection';
import {captureInterest} from './intake-store';

export async function submitPortfolio(owner:string,b:any){
 validateMutationId(b.requestId);
 if(b.intent!=='freelance'||b.website||typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token)||b.privacy!==true)throw new CRMError('Solicitação inválida.');
 const bounded=(value:any,max:number,required=true)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new CRMError('Confira os campos do contato.');return value.trim();};
 const name=bounded(b.name,100),email=bounded(b.email,180),message=bounded(b.message,4000),service=bounded(b.service??'',120,false);
 const contact={name,company:name,email,phone:'',preference:'E-mail',privacy:true,marketing:false};validateContact(contact);
 const db=env.DB!,now=new Date().toISOString(),formId=await stableId(owner,'intake-form','portfolio-contato:1'),id=await stableId(owner,'intake-session',b.requestId),tokenHash=await sha256(new TextEncoder().encode(b.token));
 const answers=JSON.stringify({name,email,message,service}),diagnosis=JSON.stringify({path:'Projeto / Freelancer · Portfólio',intent:service||'Projeto / Freelancer',message,service});
 await db.prepare('INSERT INTO intake_forms(id,owner,slug,version,definition,created) VALUES(?,?,?,1,?,?) ON CONFLICT(id) DO NOTHING').bind(formId,owner,'portfolio-contato',JSON.stringify({slug:'portfolio-contato',version:1}),now).run();
 const previous=await db.prepare('SELECT * FROM intake_sessions WHERE id=? AND owner=?').bind(id,owner).first<any>();
 if(previous){if(previous.form_id!==formId||previous.token_hash!==tokenHash||previous.answers!==answers)throw new CRMError('Solicitação já utilizada com outros dados.',409);}
 else{await createProtectionSnapshot(owner,'Antes de receber contato do portfólio');await db.prepare('INSERT INTO intake_sessions(id,owner,form_id,request_id,token_hash,answers,diagnosis,attribution,created,expires) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,owner,formId,b.requestId,tokenHash,answers,diagnosis,JSON.stringify({utm_source:'portfolio'}),now,new Date(Date.now()+14*86400000).toISOString()).run();
 const saved=await db.prepare('SELECT * FROM intake_sessions WHERE id=? AND owner=?').bind(id,owner).first<any>();if(!saved||saved.form_id!==formId||saved.token_hash!==tokenHash||saved.answers!==answers)throw new CRMError('Solicitação já utilizada com outros dados.',409);}
 return captureInterest(owner,{sessionId:id,token:b.token,contact,website:''});
}
