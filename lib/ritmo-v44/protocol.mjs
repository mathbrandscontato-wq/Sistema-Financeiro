/**
 * Ritmo V4.4 integration protocol — no credentials in source code.
 * Signature authenticates a server-to-server request, not a payment.
 */
export const PROTOCOL_VERSION='2026-11-v1';
const encoder=new TextEncoder();
function ensureSecret(secret){
 if(typeof secret!=='string'||encoder.encode(secret).length<32)throw Error('Chave de integração não configurada.');
}
function ensureParts(method,path,timestamp,body){
 if(!['GET','POST'].includes(method)||typeof path!=='string'||!path.startsWith('/')||
  typeof body!=='string'||typeof timestamp!=='string'||!/^\d{10}$/.test(timestamp))
  throw Error('Requisição de integração inválida.');
}
const hexToBytes=hex=>Uint8Array.from(hex.match(/.{2}/g)||[],b=>parseInt(b,16));
const bytesToHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function importKey(secret){
 ensureSecret(secret);
 return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function canonical({method,path,timestamp,body}){
 ensureParts(method,path,timestamp,body);
 return encoder.encode(PROTOCOL_VERSION+'\n'+method+'\n'+path+'\n'+timestamp+'\n'+body);
}
export async function signRequest(secret,{method,path,timestamp,body=''}) {
 const key=await importKey(secret);
 const digest=await crypto.subtle.sign('HMAC',key,canonical({method,path,timestamp,body}));
 return 'sha256='+bytesToHex(new Uint8Array(digest));
}
export async function verifyRequestSignature(secret,{method,path,timestamp,body='',signature,nowSeconds=Math.floor(Date.now()/1000)}) {
 try{
  if(typeof signature!=='string'||!/^sha256=[0-9a-f]{64}$/.test(signature)||!Number.isFinite(nowSeconds))return false;
  ensureParts(method,path,timestamp,body);
  if(Math.abs(Number(timestamp)-nowSeconds)>300)return false;
  const key=await importKey(secret);
  return await crypto.subtle.verify('HMAC',key,hexToBytes(signature.slice(7)),canonical({method,path,timestamp,body}));
 }catch{return false}
}
export async function verifyIncomingRequest(req,secret){
 const url=new URL(req.url),body=await req.clone().text();
 return verifyRequestSignature(secret,{
  method:req.method,path:url.pathname+url.search,body,
  timestamp:req.headers.get('X-MB-Timestamp')||'',
  signature:req.headers.get('X-MB-Signature')||''
 });
}
