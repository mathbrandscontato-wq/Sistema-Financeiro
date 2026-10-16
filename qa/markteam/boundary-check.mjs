import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {errorDetails} from '../../lib/error-info.mjs';
import {CRMError} from '../../lib/crm.mjs';
assert.deepEqual(errorDetails(new CRMError('Conflito de teste',409)),{message:'Conflito de teste',status:409});
assert.deepEqual(errorDetails(new Error('Falha de teste')),{message:'Falha de teste',status:undefined});
for(const thrown of [null,undefined,'opaque',42,{}])assert.deepEqual(errorDetails(thrown),{message:'',status:undefined});
assert.deepEqual(errorDetails({message:3,status:'503'}),{message:'',status:undefined});
const source=await readFile('lib/http-client.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {fetchJson}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const original=globalThis.fetch;let requested;
try{
 globalThis.fetch=async(url,options)=>{requested={url,options};return Response.json({ok:true,id:'synthetic-record'});};
 assert.deepEqual(await fetchJson('/api/synthetic'),{ok:true,id:'synthetic-record'});
 assert.deepEqual(requested,{url:'/api/synthetic',options:{cache:'no-store'}});
 globalThis.fetch=async()=>Response.json({error:'Revisão já alterada'},{status:409});
 await assert.rejects(fetchJson('/api/synthetic'),/Revisão já alterada/);
 globalThis.fetch=async()=>Response.json({},{status:503});
 await assert.rejects(fetchJson('/api/synthetic','Serviço indisponível'),/Serviço indisponível/);
 globalThis.fetch=async()=>{throw Error('Offline de teste');};
 await assert.rejects(fetchJson('/api/synthetic'),/Offline de teste/);
}finally{globalThis.fetch=original;}
console.log('PASS: fronteiras tipadas preservam erro/status, cache, falha HTTP e falha de rede com fixtures artificiais.');
