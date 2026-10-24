// Isolated recovery drill for the v8 owner snapshot format.
// Fixtures only; never executes SQL against D1, R2, network or production.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {COMMERCIAL_TABLES} from '../../lib/commercial-import.mjs';
import {PROSPECTING_SNAPSHOT_TABLES,prospectingSnapshotQueries} from '../../lib/prospecting/snapshot.mjs';
import {RuntimeStore} from '../../lib/prospecting/runtime-store.mjs';

const owner='restore-fixture-owner',other='restore-fixture-other';
const account='restore-fixture-account',phone='5547999990000',at='2026-10-24T13:30:00.000Z';
const allTables=['quotes','settings','events','document_exports',...COMMERCIAL_TABLES,...PROSPECTING_SNAPSHOT_TABLES];
const id=s=>s.replace(/[^a-z0-9_]/g,'');
const sha256=b=>createHash('sha256').update(b).digest('hex');

function database(){
 const s=new DatabaseSync(':memory:');
 s.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync('drizzle').filter(n=>/^\d{4}.*\.sql$/.test(n)).sort())
  s.exec(readFileSync('drizzle/'+name,'utf8'));
 return s;
}
function adapter(s){
 function statement(sql,values=[]){
  return {bind(...v){return statement(sql,v);},async all(){return {results:s.prepare(sql).all(...values)};},
   async first(){return s.prepare(sql).get(...values)||null;},
   async run(){return {meta:{changes:Number(s.prepare(sql).run(...values).changes)}};}};
 }
 return {prepare:statement,async batch(stmts){
  s.exec('BEGIN');
  try{const results=[];for(const x of stmts)results.push(await x.all());s.exec('COMMIT');return results;}
  catch(e){s.exec('ROLLBACK');throw e;}
 }};
}
function add(s,table,values){
 assert.match(table,/^[a-z_]+$/);
 const keys=Object.keys(values);
 s.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>values[k]));
}
function seed(s,who,suffix,accountId){
 const client='client-'+suffix,opp='opp-'+suffix,contract='contract-'+suffix;
 add(s,'quotes',{owner:who,data:'{"fixture":true}',created:at,updated:at});
 add(s,'commercial_clients',{id:client,owner:who,identity_key:'identity-'+suffix,display_name:'EMPRESA FICTICIA '+suffix,created:at,updated:at});
 add(s,'commercial_opportunities',{id:opp,owner:who,client_id:client,title:'Projeto ficticio '+suffix,stage:'Fechado',created:at,updated:at});
 add(s,'commercial_contracts',{id:contract,owner:who,opportunity_id:opp,amount_cents:50000,status:'Confirmado manualmente',payment_knowledge:'confirmed',created:at});
 add(s,'commercial_payments',{id:'payment-'+suffix,owner:who,contract_id:contract,amount_cents:20000,paid_on:'2026-10-24',confirmation:'Comprovacao ficticia QA',evidence:'{"fixture":true}',created:at});
 add(s,'financial_history',{id:'audit-'+suffix,owner:who,contract_id:contract,action:'Registro financeiro ficticio',data:'{"fixture":true}',created:at});
 add(s,'site_offers',{id:'offer-'+suffix,owner:who,opened:'2026-10-24',price_cents:50000,deposit_policy:'contract_deposit'});
 add(s,'prospecting_accounts',{owner:who,account:accountId,dry_run:1,kill_switch:1,config:JSON.stringify({costPolicy:'free_only',budgets:{limitMicros:0,estimates:{}}}),revision:1,updated:at});
 add(s,'prospecting_costs',{owner:who,day:'2026-10-24',provider:'free:tavily_search',attempt:'fixture-cost-'+suffix,cost_micros:0,created:at});
 add(s,'prospecting_runs',{owner:who,local_day:'2026-10-24',status:'complete',token:'fixture-run-'+suffix,attempt:1,lease_until:0,report:'{"fixture":true}'});
 add(s,'prospecting_outreach',{account:accountId,local_day:'2026-10-24',recipient:phone,attempt_key:'fixture-contact-'+suffix,status:'reserved',created:at});
 if(who===owner){
  add(s,'document_exports',{id:'fixture-export',owner:who,quote_id:1,revision:1,template_version:'mathbrands-v1',object_key:'fixture-only.pdf',sha256:'a'.repeat(64),snapshot:'{"fixture":true}',created:at});
  add(s,'prospecting_consents',{owner:who,recipient:phone,channel:'whatsapp',brand:'Math Brands',purpose:'sites',evidence:'consentimento-ficticio',granted_at:'2026-10-23T10:00:00Z',revoked_at:at,opt_out:1,updated:at});
  add(s,'prospecting_conversations',{owner:who,recipient:phone,opportunity_id:opp,paused:1,opted_out:1,last_real_inbound:at,created:at,updated:at});
  add(s,'prospecting_inbox',{account:accountId,event_id:'fixture-inbound',owner:who,recipient:phone,kind:'message',payload:'{"fictional":true}',source_mode:'real',simulated:0,state:'processed',created:at,processed:at});
  add(s,'prospecting_outbox',{owner:who,key:'fixture-uncertain',account:accountId,recipient:phone,channel:'whatsapp',payload:'{"fictional":true}',source_mode:'real',simulated:0,state:'uncertain',attempts:1,created:at,updated:at});
  add(s,'prospecting_handoffs',{owner:who,event_id:'fixture-handoff',opportunity_id:opp,summary:'Interesse ficticio para teste',status:'pending',created:at});
  add(s,'prospecting_approvals',{owner:who,recipient:phone,opportunity_id:opp,approval_ref:'fixture-review',approved_by:who,briefing_ref:'fixture-briefing',acceptance_event:'fixture-inbound',pix_ref:'fixture-not-real',capacity:1,created:at,updated:at});
  add(s,'prospecting_companies',{owner:who,identity:'fictional-company',market:'fixture',data:'{"unverified":true}',score:0,grade:'D',created:at,updated:at});
 }
}
function canonical(rows){return rows.map(r=>JSON.stringify(r)).sort();}
function rowsOf(s,table){return s.prepare('SELECT * FROM '+table).all();}
async function exportOwner(s,who){
 const db=adapter(s);
 const [quotes,settings,events,exports,...rest]=await db.batch([
  ...['quotes','settings','events','document_exports'].map(t=>db.prepare('SELECT * FROM '+t+' WHERE owner=?').bind(who)),
  ...COMMERCIAL_TABLES.map(t=>db.prepare('SELECT * FROM '+t+' WHERE owner=?').bind(who)),
  ...prospectingSnapshotQueries(db,who)]);
 const payload={schemaVersion:2,kind:'mathbrands-protection-snapshot',dataModelVersion:8,
  quoteRecords:quotes.results,settingsRecords:settings.results,eventRecords:events.results,exportRecords:exports.results,
  commercialRecords:Object.fromEntries(COMMERCIAL_TABLES.map((t,i)=>[t,rest[i].results])),
  prospectingRecords:Object.fromEntries(PROSPECTING_SNAPSHOT_TABLES.map((t,i)=>[t,rest[COMMERCIAL_TABLES.length+i].results]))};
 const bytes=Buffer.from(JSON.stringify(payload)),digest=sha256(bytes);
 return {bytes,digest,payload};
}
function dependencyOrder(s,tables){
 const set=new Set(tables),ordered=[],pending=new Set(tables);
 while(pending.size){
  let progressed=false;
  for(const table of [...pending]){
   const dependencies=s.prepare('PRAGMA foreign_key_list('+table+')').all().map(r=>r.table).filter(t=>set.has(t));
   if(dependencies.every(t=>!pending.has(t))){ordered.push(table);pending.delete(table);progressed=true;}
  }
  assert.ok(progressed,'Unexpected cyclic snapshot foreign keys');
 }
 return ordered;
}
function restoreToEmptyDatabase(s,{bytes,digest},who){
 assert.equal(sha256(bytes),digest,'snapshot_sha256_mismatch');
 const payload=JSON.parse(bytes);
 assert.equal(payload.kind,'mathbrands-protection-snapshot');
 assert.equal(payload.schemaVersion,2);
 assert.equal(payload.dataModelVersion,8);
 const records={quotes:payload.quoteRecords,settings:payload.settingsRecords,events:payload.eventRecords,
  document_exports:payload.exportRecords,...payload.commercialRecords,...payload.prospectingRecords};
 assert.deepEqual(Object.keys(records).sort(),[...allTables].sort(),'snapshot_tables_missing');
 const permittedAccounts=new Set(records.prospecting_accounts.map(row=>row.account));
 for(const table of allTables){
  assert.ok(Array.isArray(records[table]));
  assert.equal(rowsOf(s,table).length,0,'restore_requires_empty_isolated_database');
  for(const row of records[table]){
   assert.equal(table==='prospecting_outreach'?permittedAccounts.has(row.account):row.owner===who,true,'cross_owner_snapshot_row');
  }
 }
 s.exec('BEGIN');
 try{
  for(const table of dependencyOrder(s,allTables))for(const row of records[table])add(s,table,row);
  s.exec('COMMIT');
 }catch(e){s.exec('ROLLBACK');throw e;}
 assert.deepEqual(s.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.equal(s.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 for(const table of allTables)assert.deepEqual(canonical(rowsOf(s,table)),canonical(records[table]),'restored_rows_mismatch:'+table);
}
const source=database(),restored=database(),tamper=database();
try{
 seed(source,owner,'owner',account);
 seed(source,other,'other','restore-other-account');
 const snapshot=await exportOwner(source,owner);
 assert.equal(snapshot.payload.prospectingRecords.prospecting_outreach.length,1);
 assert.equal(snapshot.payload.prospectingRecords.prospecting_costs.length,1);
 assert.equal(snapshot.payload.commercialRecords.commercial_contracts.length,1);
 assert.equal(snapshot.payload.commercialRecords.commercial_payments.length,1);
 assert.equal(snapshot.payload.commercialRecords.financial_history.length,1);
 assert.equal(snapshot.payload.prospectingRecords.prospecting_outbox[0].state,'uncertain');
 assert.equal(snapshot.payload.prospectingRecords.prospecting_consents[0].opt_out,1);
 assert.equal(snapshot.payload.prospectingRecords.prospecting_conversations[0].paused,1);
 assert.ok(!snapshot.bytes.toString().includes('restore-fixture-other'));
 const corrupted=Buffer.from(snapshot.bytes);
 corrupted[corrupted.length-2]^=1;
 assert.throws(()=>restoreToEmptyDatabase(tamper,{bytes:corrupted,digest:snapshot.digest},owner),/snapshot_sha256_mismatch/);
 restoreToEmptyDatabase(restored,snapshot,owner);
 const store=new RuntimeStore(adapter(restored));
 assert.equal((await store.account(owner)).killSwitch,true);
 assert.equal((await store.account(owner)).dryRun,true);
 assert.equal((await store.consent(owner,phone)).optOut,true);
 assert.equal((await store.conversation(owner,phone)).paused,true);
 assert.equal((await store.outbox(owner,'fixture-uncertain')).state,'uncertain');
 assert.equal(await store.claimOutbox(owner,'fixture-uncertain','fixture-retry',at),null,'uncertain output must not replay');
 assert.equal(await store.claimOutbox(owner,'new-key','fixture-retry',at),null,'restored paused configuration stays inert');
 assert.equal(rowsOf(restored,'prospecting_costs').length,1);
 assert.equal(rowsOf(source,'prospecting_costs').length,2,'other owners share a provider quota in the original DB');
 assert.equal(rowsOf(restored,'prospecting_costs').length<rowsOf(source,'prospecting_costs').length,true,
  'owner snapshot is NOT a global provider ledger backup; require whole-D1 recovery control');
 console.log('PASS: v8 owner snapshot SHA-256, isolated restore, foreign keys, all commercial/financial records, opt-out, human pause, uncertain outbox, owner isolation and fail-closed replay; zero network/production writes.');
 console.log('LIMITATION: owner-scoped snapshot is not a full D1/R2 disaster recovery backup (global provider quotas and PDF objects require separate verification).');
}finally{source.close();restored.close();tamper.close();}
