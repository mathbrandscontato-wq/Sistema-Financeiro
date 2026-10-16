import {CRMError} from './crm.mjs';
export function brandLink(value,kind){
 if(value==null||value==='')return null;
 if(typeof value!=='string'||value.length>500)throw new CRMError('Link inválido.');
 let s=value.trim();if(!s)return null;
 if(kind==='instagram'&&!s.includes('/'))s='https://www.instagram.com/'+s.replace(/^@/,'');
 else if(!/^https?:\/\//i.test(s))s='https://'+s;
 let u;try{u=new URL(s);}catch{throw new CRMError('Revise o '+(kind==='instagram'?'Instagram':'site')+'.');}
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||!u.hostname.includes('.')||/[\s<>]/.test(s))throw new CRMError('Link inválido. Use um endereço público http ou https.');
 if(kind==='instagram'){if(!['instagram.com','www.instagram.com'].includes(u.hostname.toLowerCase())||!/^\/[a-zA-Z0-9_.]{1,30}\/?$/.test(u.pathname))throw new CRMError('Informe o @ ou o link do perfil no Instagram.');u.protocol='https:';u.hostname='www.instagram.com';u.search='';u.hash='';}
 return u.href;
}
