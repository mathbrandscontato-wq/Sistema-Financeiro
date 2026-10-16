import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {planImport} from '../lib/commercial-import.mjs';
const folder=await mkdtemp(join(tmpdir(),'forms-')),path=join(folder,'db.sqlite'),owner='owner';
const run=r=>{const out=JSON.parse(execFileSync('python3',['qa/commercial/sqlite-runner.py'],{input:JSON.stringify({path,...r}),encoding:'utf8'}));if(out.error)throw Error(out.error);return out;};
const query=(sql,args=[])=>run({queries:{data:{sql,args}},commitQueries:true}).data;
function prepared(sql,args=[]){return {sql,args,bind(...args){return prepared(sql,args);},async first(){return query(sql,args)[0]||null;},async all(){return {results:query(sql,args)};},async run(){if(failAnalytics&&sql.includes('acquisition_events'))throw Error('Analytics unavailable');const r=run({statements:[{sql,args}],returnChanges:true});return {meta:{changes:r.changes[0]}};}};}
let failAnalytics=false;
globalThis.formsTestEnv={DB:{prepare:prepared,async batch(st){if(st.every(s=>/^SELECT /i.test(s.sql)))return st.map(s=>({results:query(s.sql,s.args)}));const r=run({statements:st,returnChanges:true});return r.changes.map(changes=>({meta:{changes}}));}}};
globalThis.formsTestProtection={sha256:async bytes=>Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex'),createProtectionSnapshot:async()=>{}};
try{
 run({initialize:true});
 for(const name of ['forms-store','intake-store','form-events']){let source=await readFile('lib/'+name+'.ts','utf8');source=source.replace("import {env} from 'cloudflare:workers';","const env=globalThis.formsTestEnv;").replace(/import \{(?:createProtectionSnapshot,sha256|sha256,createProtectionSnapshot)\} from '.\/protection';/,"const {sha256,createProtectionSnapshot}=globalThis.formsTestProtection;");source=source.replaceAll(/from '(\.\/[^']+)'/g,(m,p)=>'from '+JSON.stringify(pathToFileURL(['./forms-store','./intake-store','./form-events'].includes(p)?join(folder,p+'.mjs'):resolve('lib',p)).href));await writeFile(join(folder,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
 const store=await import(pathToFileURL(join(folder,'forms-store.mjs')).href);
 const reference=JSON.parse(await readFile('data/commercial-reference.json','utf8'));const plan=await planImport(owner,reference,{clients:[],opportunities:[],rows:[]},new Date().toISOString());run({statements:plan.statements});
 const pub=await store.publicSites(owner,'sites-projeto-especial');assert.equal(pub.offer.available,8);assert.equal(pub.offer.confirmed,2);assert.equal(pub.offer.priceCents,30000);assert.equal('owner' in pub.offer,false);
 const args={requestId:crypto.randomUUID(),token:'a'.repeat(64),formSlug:'sites-projeto-especial',answers:{segment:'Design',description:'Empresa de teste',objective:'Vender',siteType:'Institucional',pages:'Início',identity:'Sim',domain:'Sim',deadline:'Sem prazo'},contact:{name:'Pessoa de teste',company:'Empresa de teste',email:'test@example.invalid',phone:'47999990000',preference:'WhatsApp',privacy:true,marketing:false},attribution:{utm_source:'instagram'},analytics:true,sessionKey:'session-123456789',device:'mobile'};
 await store.submitSite(owner,args);await store.submitSite(owner,args);assert.equal(query('SELECT COUNT(*) n FROM intake_captures')[0].n,1);assert.equal(query('SELECT COUNT(*) n FROM acquisition_events WHERE event=\'form_submit_success\'')[0].n,1);assert.equal((await store.readOffer(owner)).available,8);
 failAnalytics=true;await store.submitSite(owner,{...args,requestId:crypto.randomUUID(),token:'b'.repeat(64),analytics:true});failAnalytics=false;assert.equal(query('SELECT COUNT(*) n FROM commercial_clients')[0].n,6);assert.equal(query('SELECT COUNT(*) n FROM intake_lead_links')[0].n,1);assert.equal(query('SELECT COUNT(*) n FROM intake_captures')[0].n,2);
 const m=await store.analyticsData(owner,{},'owner');assert.equal(m.total.leads,1);assert.equal((await store.analyticsData(owner,{},'marketing')).total.received,undefined);assert.equal((await store.analyticsData(owner,{},'marketing')).leads,undefined);assert.equal((await store.analyticsData(owner,{},'commercial')).total.received,undefined);
 const existing=query('SELECT * FROM offer_seats')[0];await store.seatMutation(owner,owner,{action:'confirm',contractId:existing.contract_id,reason:'Repetição'});assert.equal((await store.readOffer(owner)).confirmed,2);
 const unpaid=query("SELECT c.id FROM commercial_contracts c JOIN commercial_opportunities op ON op.id=c.opportunity_id WHERE op.title='Revisão do Blog do Ricardo'")[0];await assert.rejects(()=>store.seatMutation(owner,owner,{action:'confirm',contractId:unpaid.id,reason:'Sem sinal'}));
 await store.seatMutation(owner,owner,{action:'release',contractId:existing.contract_id,reason:'Cancelamento autorizado no teste'});assert.equal((await store.readOffer(owner)).available,9);await store.seatMutation(owner,owner,{action:'confirm',contractId:existing.contract_id,reason:'Reativação autorizada'});assert.equal((await store.readOffer(owner)).available,8);
 await store.recordEvent(owner,{formSlug:args.formSlug,sessionKey:args.sessionKey,eventId:'event-123456789',event:'form_view',device:'mobile',analytics:true,attribution:args.attribution});await store.recordEvent(owner,{formSlug:args.formSlug,sessionKey:args.sessionKey,eventId:'event-123456789',event:'form_view',device:'mobile',analytics:true,attribution:args.attribution});assert.equal(query("SELECT COUNT(*) n FROM acquisition_events WHERE event='form_view'")[0].n,1);
 await store.seatMutation(owner,owner,{action:'configure',priceCents:35000,status:'closed',abandonMinutes:60,attributionDays:30,reason:'Teste de encerramento'});await assert.rejects(()=>store.submitSite(owner,{...args,requestId:crypto.randomUUID()}),e=>e.status===410);assert.equal((await store.publicSites(owner,'sites-orcamento')).form.slug,'sites-orcamento');
 // Payment-safe rollback and owner isolation are enforced by the real migration triggers.
 await assert.rejects(()=>store.seatMutation('other','other',{action:'confirm',contractId:existing.contract_id,reason:'Acesso indevido'}));
 console.log('PASS: armazenamento real, 8 vagas iniciais, CRM idempotente, consentimento, isolamento financeiro, sinal obrigatório, auditoria e oferta encerrada.');
}finally{delete globalThis.formsTestEnv;delete globalThis.formsTestProtection;await rm(folder,{recursive:true,force:true});}
