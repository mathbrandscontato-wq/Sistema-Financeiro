// Verification primitive only. No public route or real number connection yet.
export async function verifyWebhook(rawBody,signature,secret){
 if(!secret||!/^sha256=[a-f0-9]{64}$/.test(signature||''))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.slice(7).match(/../g),x=>parseInt(x,16));
 return crypto.subtle.verify('HMAC',key,bytes,typeof rawBody==='string'?new TextEncoder().encode(rawBody):rawBody);
}
export class MockMessenger{
 constructor(){this.mode='mock';this.sent=[];}
 async send(){throw new Error('real_sends_disabled');}
 async preview(message){this.sent.push(structuredClone(message));return {status:'simulated',id:'mock-'+this.sent.length};}
}
