import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {COMMERCIAL_TABLES,planImport,planQuoteLink,identity,reconciliation,validateSource,stableId} from '../../lib/commercial-import.mjs';
const reference=JSON.parse(await readFile('data/commercial-reference.json','utf8'));
const dir=await mkdtemp(join(tmpdir(),'mathbrands-commercial-')),path=join(dir,'test.sqlite');
const run=request=>JSON.parse(execFileSync('python3',['qa/commercial/sqlite-runner.py'],{input:JSON.stringify({path,...request}),encoding:'utf8'}));
const query=(sql,...args)=>({sql,args});
const tables=COMMERCIAL_TABLES;
const records=owner=>run({queries:Object.fromEntries(tables.map(t=>[t,query(`SELECT * FROM ${t} WHERE owner=? ORDER BY ${t==='commercial_quote_links'?'quote_id':['operational_state','acquisition_config'].includes(t)?'owner':'id'}`,owner)]))});
const existing=owner=>{const d=records(owner);return {clients:d.commercial_clients,opportunities:d.commercial_opportunities,rows:d.commercial_import_rows};};
const now='2026-10-10T10:00:00.000Z',owner='owner-one';
try{
 run({initialize:true});assert.equal(identity('Lavander Cerâmicas'),'lavander ceramicas');assert.notEqual(await stableId('one','client','x'),await stableId('two','client','x'));
 assert.deepEqual(reconciliation(reference),{opportunities:5,contracts:3,contractedCents:95000,receivedCents:22500,pipelineCents:50000,referenceBalanceCents:72500,unknownPaymentContracts:1,undatedPayments:1});
 const corrupted=structuredClone(reference);corrupted.rows[0].paymentKnowledge='unknown';assert.throws(()=>validateSource(corrupted),/confirmação/);corrupted.rows[0].depositCents=99999;assert.throws(()=>validateSource(corrupted),/supera/);
 const duplicated=structuredClone(reference);duplicated.rows.push(duplicated.rows[0]);assert.throws(()=>validateSource(duplicated),/duplicada/);
 const originalQuote='{"status":"Aprovado","payments":[{"cents":1000}],"settings":{"bank":"Nubank"},"templateVersion":"mathbrands-v1"}';
 run({statements:[{sql:'INSERT INTO quotes(owner,data,created,updated) VALUES(?,?,?,?)',args:[owner,originalQuote,now,now]}]});
 const plan=await planImport(owner,reference,existing(owner),now);assert.equal(plan.report.newClients,5);assert.equal(plan.report.newPayments,2);assert.equal(plan.report.conflicts.length,0);assert.deepEqual(run({statements:plan.statements}),{});
 let d=records(owner);assert.equal(d.commercial_clients.length,5);assert.equal(d.commercial_opportunities.length,5);assert.equal(d.commercial_contracts.length,3);assert.equal(d.commercial_payments.length,2);assert.equal(d.commercial_import_batches.length,1);
 assert.equal(d.commercial_contracts.reduce((s,r)=>s+r.amount_cents,0),95000);assert.equal(d.commercial_payments.reduce((s,r)=>s+r.amount_cents,0),22500);
 const lavanderId=await stableId(owner,'contract',reference.namespace+':lavander-ceramicas');assert.equal(d.commercial_payments.find(p=>p.contract_id===lavanderId).paid_on,null);
 const ambientalId=await stableId(owner,'contract',reference.namespace+':consultoria-ambiental');assert.equal(d.commercial_payments.find(p=>p.contract_id===ambientalId).paid_on,'2026-10-09');
 const ricardoId=await stableId(owner,'contract',reference.namespace+':revisao-blog-ricardo');assert.equal(d.commercial_contracts.find(c=>c.id===ricardoId).payment_knowledge,'unknown');assert.equal(d.commercial_payments.filter(p=>p.contract_id===ricardoId).length,0);assert.ok(d.commercial_contracts.every(c=>c.confirmed_on===null));
 assert.ok(d.commercial_clients.every(c=>c.email===null&&c.phone===null));assert.equal(d.commercial_history.length,5);
 const repeat=await planImport(owner,reference,existing(owner),now);assert.equal(repeat.statements.length,0);assert.equal(repeat.report.unchanged,5);
 // Same precomputed request racing after the first commit rolls back as a unit.
 assert.ok(run({statements:plan.statements}).error);assert.deepEqual(records(owner),d);
 const changed=structuredClone(reference);changed.sourceSha256='a'.repeat(64);changed.rows[0].amountCents+=100;changed.rows[0].sourceBalanceCents+=100;
 const conflict=await planImport(owner,changed,existing(owner),now);assert.equal(conflict.report.conflicts.length,1);assert.equal(conflict.statements.length,0);assert.deepEqual(records(owner),d);
 // A later local edit is not reset by repeating the original source.
 run({statements:[{sql:'UPDATE commercial_opportunities SET next_action=? WHERE id=? AND owner=?',args:['Próxima ação atualizada',d.commercial_opportunities[0].id,owner]}]});
 assert.equal((await planImport(owner,reference,existing(owner),now)).statements.length,0);assert.equal(records(owner).commercial_opportunities[0].next_action,'Próxima ação atualizada');
 // Each account has independent keys and ledger, even when importing the same file.
 const second=await planImport('owner-two',reference,existing('owner-two'),now);assert.equal(second.report.newOpportunities,5);assert.deepEqual(run({statements:second.statements}),{});assert.equal(records(owner).commercial_payments.length,2);assert.equal(records('owner-two').commercial_payments.length,2);
 const opportunity=d.commercial_opportunities[0],quote=run({queries:{quote:query('SELECT * FROM quotes WHERE id=1')}}).quote[0];
 const link=planQuoteLink(owner,opportunity,quote,[],now);assert.equal(link.length,2);assert.deepEqual(run({statements:link}),{});
 const links=records(owner).commercial_quote_links;assert.equal(planQuoteLink(owner,opportunity,quote,links,now).length,0);assert.throws(()=>planQuoteLink('owner-two',opportunity,quote,[],now),/inválido/);assert.throws(()=>planQuoteLink(owner,d.commercial_opportunities[1],quote,links,now),/já possui/);
 assert.equal(run({queries:{quote:query('SELECT data,revision,deleted FROM quotes WHERE id=1')}}).quote[0].data,originalQuote);
 // A manually existing matching opportunity is a conflict, not a duplicate.
 const preexisting={clients:d.commercial_clients,opportunities:d.commercial_opportunities,rows:[]};const duplicate=await planImport(owner,reference,preexisting,now);assert.equal(duplicate.report.conflicts.length,5);assert.equal(duplicate.statements.length,0);
 assert.equal(run({queries:{quote:query('SELECT count(*) AS n FROM quotes')}}).quote[0].n,1);
 console.log('PASS: 5 oportunidades, 3 contratações, 2 sinais; R$ 950,00 contratado e R$ 225,00 registrado.');
 console.log('PASS: importação repetida/concorrente sem duplicação, conflitos sem sobrescrita, contas isoladas, datas ausentes preservadas.');
 console.log('PASS: vínculo manual e cópias da origem, orçamento e pagamentos originais intactos.');
}finally{await rm(dir,{recursive:true,force:true});}
