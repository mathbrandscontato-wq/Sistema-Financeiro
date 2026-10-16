import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {planImport} from '../lib/commercial-import.mjs';
const folder=await mkdtemp(join(tmpdir(),'forms-')),path=join(folder,'db.sqlite'),owner='owner';
const run=r=>{const out=JSON.parse(execFileSync(process.env.PORTFOLIO_TEST_PYTHON||'python3',['qa/commercial/sqlite-runner.py'],{input:JSON.stringify({path,...r}),encoding:'utf8'}));if(out.error)throw Error(out.error);return out;};
const query=(sql,args=[])=>run({queries:{data:{sql,args}},commitQueries:true}).data;
function prepared(sql,args=[]){return {sql,args,bind(...args){return prepared(sql,args);},async first(){return query(sql,args)[0]||null;},async all(){return {results:query(sql,args)};},async run(){if(failAnalytics&&sql.includes('acquisition_events'))throw Error('Analytics unavailable');const r=run({statements:[{sql,args}],returnChanges:true});return {meta:{changes:r.changes[0]}};}};}
let failAnalytics=false;
globalThis.formsTestEnv={DB:{prepare:prepared,async batch(st){if(st.every(s=>/^SELECT /i.test(s.sql)))return st.map(s=>({results:query(s.sql,s.args)}));const r=run({statements:st,returnChanges:true});return r.changes.map(changes=>({meta:{changes}}));}}};
globalThis.formsTestProtection={sha256:async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex'),createProtectionSnapshot:async()=>{}};
try{
 run({initialize:true});
 for(const name of ['forms-store','intake-store','form-events','portfolio-store']){let source=await readFile('lib/'+name+'.ts','utf8');source=source.replace("import {env} from 'cloudflare:workers';","const env=globalThis.formsTestEnv;").replace(/import \{(?:createProtectionSnapshot,sha256|sha256,createProtectionSnapshot)\} from '.\/protection';/,"const {sha256,createProtectionSnapshot}=globalThis.formsTestProtection;");source=source.replaceAll(/from '(\.\/[^']+)'/g,(m,p)=>'from '+JSON.stringify(pathToFileURL(['./forms-store','./intake-store','./form-events','./portfolio-store'].includes(p)?join(folder,p+'.mjs'):resolve('lib',p)).href));await writeFile(join(folder,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
 const store=await import(pathToFileURL(join(folder,'portfolio-store.mjs')).href);
 const input={requestId:crypto.randomUUID(),token:'a'.repeat(64),intent:'freelance',name:'Pessoa de teste',email:'portfolio@example.invalid',message:'Gostaria de uma apresenta��o institucional.',service:'apresentacoes',privacy:true};
 await store.submitPortfolio(owner,input);await store.submitPortfolio(owner,input);
 assert.equal(query('SELECT COUNT(*) n FROM commercial_clients')[0].n,1);
 assert.equal(query('SELECT COUNT(*) n FROM commercial_opportunities')[0].n,1);
 const opportunity=query('SELECT * FROM commercial_opportunities')[0];assert.equal(opportunity.stage,'Novo lead');assert.equal(opportunity.origin,'portfolio');assert.equal(opportunity.amount_cents,null);
 assert.equal(query('SELECT COUNT(*) n FROM intake_captures')[0].n,1);
 assert.equal(JSON.parse(query("SELECT data FROM commercial_history WHERE json_extract(data,'$.kind')='intake'")[0].data).answers.message,input.message);
 await assert.rejects(()=>store.submitPortfolio(owner,{...input,message:'Alterado'}),e=>e.status===409);
 await assert.rejects(()=>store.submitPortfolio(owner,{...input,intent:'oportunidade'}));
 await assert.rejects(()=>store.submitPortfolio(owner,{...input,privacy:false}));
 await store.submitPortfolio(owner,{...input,requestId:crypto.randomUUID(),message:'Outro pedido'});
 assert.equal(query('SELECT COUNT(*) n FROM commercial_clients')[0].n,1);
 assert.equal(query('SELECT COUNT(*) n FROM commercial_opportunities')[0].n,1);
 for(const table of ['commercial_contracts','commercial_payments'])assert.equal(query('SELECT COUNT(*) n FROM '+table)[0].n,0);
 assert.equal(query('SELECT COUNT(*) n FROM commercial_opportunities WHERE owner=?',['other'])[0].n,0);
 console.log('PASS: lead persistido, contato e mensagem preservados, retry idempotente, consentimento e nenhum contrato/pagamento.');
}finally{delete globalThis.formsTestEnv;delete globalThis.formsTestProtection;await rm(folder,{recursive:true,force:true});}
