import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {buildDashboard,DASHBOARD_TABLES,dashboardFilters} from '../../lib/dashboard.mjs';
import {planImport,planQuoteLink} from '../../lib/commercial-import.mjs';
import {planQuoteReceipt,planReverse,planReview,planContractSave,contractInput} from '../../lib/finance.mjs';
import {blank} from '../../lib/core.mjs';
const folder=await mkdtemp(join(tmpdir(),'mathbrands-dashboard-')),path=join(folder,'test.sqlite'),owner='dash-owner',other='dash-other',asOf='2026-10-10',now='2026-10-10T12:00:00Z';
const run=r=>JSON.parse(execFileSync('python3',['qa/commercial/sqlite-runner.py'],{input:JSON.stringify({path,...r}),encoding:'utf8'}));
const all=t=>run({queries:{rows:{sql:`SELECT * FROM ${t} ORDER BY rowid`}}}).rows;
const records=()=>Object.fromEntries(DASHBOARD_TABLES.map(t=>[t,all(t)]));
const read=(filters={})=>buildDashboard({owner,quotes:all('quotes'),records:records(),filters,asOf});
const execute=p=>run({statements:p.statements,returnChanges:true});
const source=JSON.parse(await readFile('data/commercial-reference.json','utf8'));
const contract=id=>all('commercial_contracts').find(c=>c.id===id);
try{
 run({initialize:true});let d=read();assert.equal(d.stats.conversion,null);assert.equal(d.stats.receivedCents,0);assert.equal(d.businesses.length,0);
 assert.throws(()=>dashboardFilters({from:'2026-10-10',to:'2026-10-09'}),/anterior/);assert.throws(()=>dashboardFilters({from:'2026-02-29'}),/inválida/);assert.throws(()=>dashboardFilters({status:'Pago'}),/Status/);
 execute(await planImport(owner,source,{clients:[],opportunities:[],rows:[]},now));
 let before=JSON.stringify({records:records(),quotes:all('quotes')});d=read();assert.equal(JSON.stringify({records:records(),quotes:all('quotes')}),before);
 assert.deepEqual({count:d.stats.proposalsCount,proposed:d.stats.proposedCents,approved:d.stats.approvedCents,pending:d.stats.pendingCents,contracted:d.stats.contractedCents,received:d.stats.receivedCents,known:d.stats.knownReceivableCents,unknown:d.stats.referenceReceivableCents,conversion:d.stats.conversion},{count:5,proposed:145000,approved:95000,pending:50000,contracted:95000,received:22500,known:22500,unknown:50000,conversion:60});
 assert.equal(d.stats.quotesIssued,0);assert.equal(d.stats.quotesTotalCents,0);assert.equal(d.stats.undatedCents,7500);assert.equal(d.stats.unknownContracts,1);assert.equal(d.trend.at(-1).receivedCents,15000);
 d=read({from:'2026-10-09',to:'2026-10-09'});assert.equal(d.stats.receivedCents,15000);assert.equal(d.stats.undatedCents,7500);assert.equal(d.stats.knownReceivableCents,22500);assert.equal(d.stats.referenceReceivableCents,50000);
 d=read({from:'2026-11-01',to:'2026-11-30'});assert.equal(d.stats.proposalsCount,0);assert.equal(d.stats.conversion,null);assert.equal(d.stats.receivedCents,0);assert.equal(d.stats.knownReceivableCents,22500);assert.equal(d.stats.referenceReceivableCents,50000);assert.equal(d.stats.contractedCents,95000);
 const lavender=all('commercial_contracts').find(c=>c.amount_cents===15000),opp=all('commercial_opportunities').find(o=>o.id===lavender.opportunity_id),client=all('commercial_clients').find(c=>c.id===opp.client_id),pay=all('commercial_payments').find(p=>p.contract_id===lavender.id);
 d=read({client:'crm:'+client.id});assert.equal(d.stats.proposalsCount,1);assert.equal(d.stats.approvedCents,15000);assert.equal(d.stats.receivedCents,7500);assert.equal(d.stats.knownReceivableCents,7500);assert.equal(d.clientOptions.length,5);
 d=read({status:'pending'});assert.equal(d.stats.proposalsCount,2);assert.equal(d.stats.pendingCents,50000);assert.equal(d.stats.contractedCents,0);assert.equal(d.stats.receivedCents,0);
 // Standalone quotes are distinct until explicitly linked; ordinary quote receipts remain included.
 const q={...blank(),company:client.display_name,client:'Contato',issued:'2026-10-08',valid:'2026-11-08',status:'Aprovado',rows:[{description:'Site',qty:'1',unit:'150',mode:'unit'}],payments:[{id:'same-receipt',cents:7500,date:'2026-10-09',note:'Sinal conferido manualmente'}]};
 run({statements:[{sql:'INSERT INTO quotes(id,owner,data,created,updated) VALUES(?,?,?,?,?)',args:[1,owner,JSON.stringify(q),now,now]}]});d=read();assert.equal(d.stats.proposalsCount,6);assert.equal(d.stats.proposedCents,160000);assert.equal(d.stats.approvedCents,110000);assert.equal(d.stats.receivedCents,30000);assert.equal(d.stats.approvedWithoutContractCount,1);assert.ok(d.alerts.some(a=>a.id==='unlinked'));
 // Link collapses commercial identity, but unreviewed old receipts never inflate the canonical ledger.
 let quote=all('quotes')[0];execute({statements:planQuoteLink(owner,opp,quote,[],now)});d=read();assert.equal(d.stats.proposalsCount,5);assert.equal(d.stats.approvedCents,95000);assert.equal(d.stats.receivedCents,22500);assert.equal(d.stats.quotesIssued,1);assert.equal(d.stats.quotesTotalCents,15000);assert.equal(d.stats.pendingReceiptCents,7500);assert.equal(d.stats.approvedWithoutContractCount,0);
 const link=all('commercial_quote_links')[0];execute(await planQuoteReceipt(owner,lavender,lavender.revision,quote,link,'same-receipt',pay,all('commercial_payments'),all('financial_quote_receipts'),crypto.randomUUID(),now));d=read();assert.equal(d.stats.receivedCents,22500);assert.equal(d.stats.pendingReceiptCount,0);assert.equal(all('quotes')[0].data,JSON.stringify(q));assert.equal(d.stats.undatedCents,7500);
 // Reversing a mapped ledger receipt never revives the duplicate quote-side amount.
 let current=contract(lavender.id);execute(await planReverse(owner,current,current.revision,pay,'Registro estornado após conferência',crypto.randomUUID(),now));d=read();assert.equal(d.stats.receivedCents,15000);assert.equal(d.stats.knownReceivableCents,30000);assert.equal(d.stats.pendingReceiptCount,0);assert.equal(d.stats.undatedCents,0);assert.equal(all('quotes')[0].data,JSON.stringify(q));
 // Date filters use real payment dates rather than quote issue dates.
 d=read({from:'2026-10-09',to:'2026-10-09'});assert.equal(d.stats.quotesIssued,0);assert.equal(d.stats.receivedCents,15000);assert.equal(d.stats.knownReceivableCents,30000);
 // CRM is the commercial authority of a linked business; financial state stays independent.
 run({statements:[{sql:'UPDATE commercial_opportunities SET stage=? WHERE id=? AND owner=?',args:['Recusado',opp.id,owner]}]});d=read();assert.equal(d.stats.refusedCents,15000);assert.equal(d.stats.approvedCents,80000);assert.ok(d.alerts.some(a=>a.id==='status:crm:'+opp.id));assert.equal(d.stats.contractedCents,95000);assert.equal(d.stats.receivedCents,15000);
 // Archival never erases historical results or outstanding contracts.
 run({statements:[{sql:'UPDATE commercial_opportunities SET archived=1 WHERE id=? AND owner=?',args:[opp.id,owner]},{sql:'UPDATE commercial_clients SET archived=1 WHERE id=? AND owner=?',args:[client.id,owner]}]});d=read();assert.equal(d.stats.proposalsCount,5);assert.equal(d.stats.contractedCents,95000);assert.equal(d.stats.refusedCents,15000);assert.ok(d.businesses.find(b=>b.opportunityId===opp.id).archived);
 // Unknown histories stay separate until explicit review; no automatic assumed zero receipt.
 const unknown=all('commercial_contracts').find(c=>c.payment_knowledge==='unknown');execute(await planReview(owner,unknown,unknown.revision,'Extrato conferido: nenhum pagamento recebido anteriormente.',crypto.randomUUID(),now));d=read();assert.equal(d.stats.referenceReceivableCents,0);assert.equal(d.stats.knownReceivableCents,80000);assert.equal(d.stats.receivedCents,15000);
 // A cancelled contract is removed from contractual positions, but commercial history stays intact.
 current=contract(lavender.id);execute(await planContractSave(owner,current,current.revision,{...contractInput(current),active:false,reason:'Contratação cancelada, sem recebimentos ativos'},all('commercial_payments'),crypto.randomUUID(),now));d=read();assert.equal(d.stats.contractedCents,80000);assert.equal(d.stats.knownReceivableCents,65000);assert.equal(d.stats.refusedCents,15000);
 // The identical source owned by another user is excluded from every metric and detail.
 execute(await planImport(other,source,{clients:[],opportunities:[],rows:[]},now));before=JSON.stringify({records:records(),quotes:all('quotes')});d=read();assert.equal(d.stats.proposalsCount,5);assert.equal(d.stats.contractedCents,80000);assert.equal(d.stats.receivedCents,15000);assert.equal(d.clientOptions.length,5);assert.equal(JSON.stringify({records:records(),quotes:all('quotes')}),before);
 // Missing amounts, zero amounts, drafts and leads are different; expiration is deterministic.
 const extra={...blank(),company:'Empresa independente',client:'Cliente',issued:'2026-09-01',valid:'2026-10-01',status:'Enviado',rows:[{description:'Projeto',qty:'60',unit:'500',mode:'package'}]};run({statements:[{sql:'INSERT INTO quotes(id,owner,data,created,updated) VALUES(?,?,?,?,?)',args:[2,owner,JSON.stringify(extra),now,now]}]});d=read({status:'expired'});assert.equal(d.stats.pendingCents,50000);assert.equal(d.stats.quotesTotalCents,50000);assert.equal(d.stats.proposalsCount,1);
 const draft={...extra,status:'Rascunho'};run({statements:[{sql:'INSERT INTO quotes(id,owner,data,created,updated) VALUES(?,?,?,?,?)',args:[3,owner,JSON.stringify(draft),now,now]}]});d=read({status:'draft'});assert.equal(d.stats.proposalsCount,0);assert.equal(d.stats.quotesIssued,0);assert.equal(d.businesses.length,1);
 const open=all('commercial_opportunities').find(o=>o.owner===owner&&o.stage==='Acompanhamento');run({statements:[{sql:'UPDATE commercial_opportunities SET amount_cents=NULL WHERE id=?',args:[open.id]}]});d=read({status:'pending'});assert.equal(d.stats.unknownAmounts,1);assert.equal(d.stats.pendingCount,3);assert.equal(d.stats.pendingCents,80000);assert.equal(d.stats.proposalsCount,3);
 run({statements:[{sql:'UPDATE commercial_opportunities SET amount_cents=0 WHERE id=?',args:[open.id]}]});d=read({status:'pending'});assert.equal(d.stats.unknownAmounts,0);assert.equal(d.stats.pendingCents,80000);
 console.log('PASS: histórico inicial, fontes vinculadas sem duplicidade, propostas emitidas distintas de negócios consolidados.');
 console.log('PASS: período comercial e recebimento real separados dos saldos atuais; datas ausentes e valores desconhecidos explícitos.');
 console.log('PASS: pagamentos conferidos, vínculos, estornos, cancelamentos e arquivamento atualizam os indicadores corretamente.');
 console.log('PASS: status comercial independente do financeiro, filtros de cliente/status, acesso por proprietário e leitura sem mutações.');
}finally{await rm(folder,{recursive:true,force:true});}
