import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const folder=await mkdtemp(join(tmpdir(),'mathbrands-markteam-')),path=join(folder,'review.sqlite'),owner='markteam-owner';
const run=arg=>{const result=JSON.parse(execFileSync('python3',['qa/commercial/sqlite-runner.py'],{input:JSON.stringify({path,...arg}),encoding:'utf8'}));if(result.error)throw Error(result.error);return result;};
const query=(sql,args=[])=>run({queries:{data:{sql,args}}}).data;
const prepared=(sql,args=[])=>({sql,args,bind(...next){return prepared(sql,next);},async first(){return query(sql,args)[0]||null;}});
let snapshots=0,failSnapshot=false;
globalThis.markteamTestEnv={DB:{prepare:prepared,async batch(statements){const result=run({statements,returnChanges:true});return result.changes.map(changes=>({meta:{changes}}));}},BUCKET:{}};
globalThis.markteamTestProtection={createProtectionSnapshot:async()=>{if(failSnapshot)throw Error('Backup unavailable');snapshots++;}};
let content=await readFile('lib/markteam-store.ts','utf8');
content=content.replace("import {env} from 'cloudflare:workers';","const env=globalThis.markteamTestEnv;").replace("import {createProtectionSnapshot} from './protection';","const {createProtectionSnapshot}=globalThis.markteamTestProtection;");
content=content.replaceAll(/from '(\.\/[^']+)'/g,(match,file)=>'from '+JSON.stringify(pathToFileURL(resolve('lib',file)).href));
const {reviewLead}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(content,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const qualification={classification:'Alta prioridade',icpTier:'A',explanation:'Operação B2B em expansão com necessidade de presença digital.',evidence:'Briefing e contato confirmados pelo responsável'};
const body=(revision=1)=>({action:'markteam_review',id:'opp-test',revision,mutationId:crypto.randomUUID(),qualification});
const readOpportunity=()=>query('SELECT * FROM commercial_opportunities WHERE id=? AND owner=?',['opp-test',owner])[0];
const reviews=()=>query('SELECT * FROM commercial_history WHERE owner=?',[owner]);
try{
 run({initialize:true});
 run({statements:[
  {sql:'INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES(?,?,?,?,?,?)',args:['client-test',owner,'test','Empresa de teste','2026-10-16','2026-10-16']},
  {sql:'INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES(?,?,?,?,?,?,?)',args:['opp-test',owner,'client-test','Revisão de site','Novo lead','2026-10-16','2026-10-16']}
 ]});
 const first=body();assert.equal((await reviewLead(owner,'reviewer-1',first)).ok,true);
 assert.equal(readOpportunity().revision,2);assert.equal(reviews().length,1);
 assert.equal(JSON.parse(reviews()[0].data).qualification.evidence,qualification.evidence);
 assert.equal(JSON.parse(reviews()[0].data).method,'manual');
 assert.equal((await reviewLead(owner,'reviewer-1',first)).reused,true);
 assert.equal(reviews().length,1);assert.equal(snapshots,1);
 await assert.rejects(reviewLead(owner,'reviewer-1',{...first,qualification:{...qualification,explanation:'Mudança não aceita no mesmo request.'}}),/outro conteúdo/);
 await assert.rejects(reviewLead(owner,'reviewer-1',body(1)),e=>e.status===409);
 await assert.rejects(reviewLead('different-owner','reviewer-1',body(1)),e=>e.status===404);
 failSnapshot=true;await assert.rejects(reviewLead(owner,'reviewer-1',body(2)),/Backup unavailable/);failSnapshot=false;
 assert.equal(readOpportunity().revision,2);assert.equal(reviews().length,1);
 const next=body(2);next.qualification={...qualification,classification:'Média prioridade',explanation:'Nova informação documentada alterou a avaliação comercial.'};
 await reviewLead(owner,'reviewer-2',next);
 assert.equal(reviews().length,2);assert.equal(readOpportunity().revision,3);
 assert.equal(JSON.parse(reviews()[1].data).reviewedBy,'reviewer-2');
 assert.equal(query('SELECT COUNT(*) AS n FROM commercial_payments')[0].n,0);
 assert.equal(query('SELECT COUNT(*) AS n FROM commercial_contracts')[0].n,0);
 console.log('PASS: revisão humana persistente em SQLite, controle otimista, idempotência, isolamento, recuperação após backup e histórico sem alterações financeiras.');
}finally{await rm(folder,{recursive:true,force:true});}
