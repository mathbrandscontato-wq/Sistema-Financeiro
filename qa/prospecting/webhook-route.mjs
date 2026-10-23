import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// Execute the real route with platform boundaries substituted. Signature,
// persistence and replay behavior are covered by the server integration suite.
const source=readFileSync(new URL('../../app/api/whatsapp/route.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const handlers={},env={COMMERCIAL_OWNER:'fixture-owner',INTAKE_OWNER:'fallback-owner'},scheduled=[],calls=[],events=[];
let accepted=false,snapshotFails=false,writes=0;
const dependencies={
 'cloudflare:workers':{env},
 'next/server':{after(task){assert.equal(typeof task,'function');events.push('scheduled');scheduled.push(task);}},
 '../../../lib/protection':{async createProtectionSnapshot(owner,reason){events.push('snapshot');assert.equal(owner,env.COMMERCIAL_OWNER||env.INTAKE_OWNER);assert.match(reason,/WhatsApp/);if(snapshotFails)throw Error('snapshot_unavailable');}},
 '../../../lib/prospecting/server.mjs':{
  async receiveWhatsApp(request,receivedEnv,options){calls.push({method:request.method,env:receivedEnv,options});if(accepted&&request.method==='POST')await options.onAccepted();return new Response('accepted',{status:200});},
  async processCommercialQueues(receivedEnv,{beforeWrite}){assert.equal(receivedEnv,env);events.push('processing');await beforeWrite();events.push('write');writes++;return {ok:true};}
 }
};
runInNewContext(outputText,{exports:handlers,require(name){assert.ok(Object.hasOwn(dependencies,name),'Unexpected route dependency: '+name);return dependencies[name];}});
const request=method=>new Request('https://crm.example.invalid/api/whatsapp',{method,...(method==='POST'?{body:JSON.stringify({owner:'untrusted-owner'})}:{})});

assert.equal((await handlers.GET(request('GET'))).status,200);assert.equal(calls.at(-1).options,undefined);assert.equal(scheduled.length,0);
assert.equal((await handlers.POST(request('POST'))).status,200);assert.equal(calls.at(-1).env,env);assert.equal(scheduled.length,0,'Unaccepted callbacks must not process a queue.');assert.equal(writes,0);
accepted=true;
assert.equal((await handlers.POST(request('POST'))).status,200);assert.equal(scheduled.length,1);assert.deepEqual(events,['scheduled']);assert.equal(writes,0,'Queue work must wait for the post-response callback.');
await scheduled.shift()();assert.deepEqual(events,['scheduled','processing','snapshot','write']);assert.equal(writes,1);

snapshotFails=true;
await handlers.POST(request('POST'));await assert.rejects(()=>scheduled.shift()(),/snapshot_unavailable/);assert.equal(writes,1,'Failed protection must block processing writes.');
snapshotFails=false;delete env.COMMERCIAL_OWNER;
await handlers.POST(request('POST'));await scheduled.shift()();assert.equal(writes,2,'The trusted fallback owner is supported.');
delete env.INTAKE_OWNER;
await handlers.POST(request('POST'));await assert.rejects(()=>scheduled.shift()(),/commercial_owner_unconfigured/);assert.equal(writes,2,'Missing trusted owner must block processing writes.');
console.log('PASS: real WhatsApp route schedules accepted events after the response, preserves GET, derives the owner from private configuration and protects queue writes. No network calls.');
