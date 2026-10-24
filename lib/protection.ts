import {COMMERCIAL_TABLES} from './commercial-import.mjs';
import {PROSPECTING_SNAPSHOT_TABLES,prospectingSnapshotQueries} from './prospecting/snapshot.mjs';
import {env} from 'cloudflare:workers';
export const sha256=async(data:Uint8Array|ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data as BufferSource))).map(v=>v.toString(16).padStart(2,'0')).join('');
export async function createProtectionSnapshot(owner:string,reason:string){
if(!env.DB||!env.BUCKET)throw Error('A proteção dos dados está indisponível. A operação não foi realizada.');
const commercialTables=COMMERCIAL_TABLES;
const [quotes,settings,events,exports,...commercial]=await env.DB.batch([env.DB.prepare('SELECT * FROM quotes WHERE owner=? ORDER BY id').bind(owner),env.DB.prepare('SELECT * FROM settings WHERE owner=?').bind(owner),env.DB.prepare('SELECT * FROM events WHERE owner=? ORDER BY id').bind(owner),env.DB.prepare('SELECT * FROM document_exports WHERE owner=? ORDER BY created').bind(owner),...commercialTables.map(t=>env.DB!.prepare(`SELECT * FROM ${t} WHERE owner=?`).bind(owner)),...prospectingSnapshotQueries(env.DB,owner)]);
const id=crypto.randomUUID(),created=new Date().toISOString();
const payload={schemaVersion:2,kind:'mathbrands-protection-snapshot',siteId:'appgprj_6ac97e7bd4f48191bb0e682861cb6af9',templateVersion:'mathbrands-v1',reason,created,quoteRecords:quotes.results,settingsRecords:settings.results,eventRecords:events.results,exportRecords:exports.results,dataModelVersion:8,commercialRecords:Object.fromEntries(commercialTables.map((t,i)=>[t,commercial[i].results])),prospectingRecords:Object.fromEntries(PROSPECTING_SNAPSHOT_TABLES.map((t,i)=>[t,commercial[commercialTables.length+i].results]))};
const bytes=new TextEncoder().encode(JSON.stringify(payload,null,2)),hash=await sha256(bytes),objectKey='snapshots/'+id+'.json';
await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:'application/json'}});
try{await env.DB.prepare('INSERT INTO protection_snapshots(id,owner,object_key,sha256,reason,created) VALUES(?,?,?,?,?,?)').bind(id,owner,objectKey,hash,reason,created).run();}catch(error){await env.BUCKET.delete(objectKey);throw error;}
return {id,created,sha256:hash};
}
