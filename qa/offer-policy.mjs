import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {CONFIRM_SEAT_SQL} from '../lib/offer-sql.mjs';
import {validDepositPolicy,offerDepositTerms} from '../lib/offer-policy.mjs';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
const migrations=readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort();
for(const name of migrations.filter(n=>!n.startsWith('0011_')))db.exec(readFileSync('drizzle/'+name,'utf8'));
db.prepare("INSERT INTO site_offers(id,owner,opened) VALUES('legacy','owner','2026-10-21')").run();
const beforeOffer=db.prepare('SELECT * FROM site_offers').get();
db.exec("INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES('old-client','owner','old','Legado fictício','2026-10-01','2026-10-01'); INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES('old-op','owner','old-client','Contrato anterior','Fechado','2026-10-01','2026-10-01'); INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,status,payment_knowledge,created) VALUES('old-contract','owner','old-op',30000,'Confirmado','confirmed','2026-10-01'); INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,confirmation,evidence,kind,created) VALUES('old-payment','owner','old-contract',15000,'Confirmado','Teste','Sinal','2026-10-01');");
const beforeMigrationFinance=JSON.stringify(['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY id').all()));
db.exec(readFileSync('drizzle/0011_offer_deposit_policy.sql','utf8'));
assert.equal(JSON.stringify(['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY id').all())),beforeMigrationFinance);
const afterOffer=db.prepare('SELECT * FROM site_offers').get();
assert.equal(afterOffer.deposit_policy,'legacy_50');delete afterOffer.deposit_policy;assert.deepEqual(afterOffer,beforeOffer);
db.prepare("INSERT INTO site_offers(id,owner,opened,price_cents,deposit_policy) VALUES('new','owner','2026-10-21',50000,'contract_deposit')").run();
db.prepare("INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES('client','owner','test','Empresa fictícia','2026-10-21','2026-10-21')").run();
let n=0;
function contract({total=50000,deposit=20000,paid=20000,kind='Sinal',reversed=false,owner='owner',stage='Fechado',active=1}={}){
 const id='contract'+(++n),op='op'+n;
 db.prepare('INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES(?,?,?,?,?,?,?)').run(op,owner,'client','Teste',stage,'2026-10-21','2026-10-21');
 db.prepare('INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,deposit_cents,status,payment_knowledge,active,created) VALUES(?,?,?,?,?,?,?,?,?)').run(id,owner,op,total,deposit,'Confirmado','confirmed',active,'2026-10-21');
 if(paid)db.prepare('INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,confirmation,evidence,kind,reversed_on,created) VALUES(?,?,?,?,?,?,?,?,?)').run('pay'+n,owner,id,paid,'Confirmado','Teste simulado',kind,reversed?'2026-10-21':null,'2026-10-21');
 return id;
}
const financial=()=>JSON.stringify(['commercial_clients','commercial_opportunities','commercial_contracts','commercial_payments'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY id').all()));
function reserve(id,offer='new',owner='owner'){
 const before=financial();const r=db.prepare(CONFIRM_SEAT_SQL).run('seat-'+id,'2026-10-21',offer,owner,id);assert.equal(financial(),before);return Number(r.changes);
}
assert.equal(reserve(contract({paid:19999})),0);assert.equal(reserve(contract()),1);
assert.equal(reserve('old-contract','legacy'),1);
assert.equal(reserve(contract({total:30000,deposit:10000,paid:10000}),'legacy'),0);
assert.equal(reserve(contract({total:30000,deposit:null,paid:14999}),'legacy'),0);
assert.equal(reserve(contract({total:30000,deposit:null,paid:15000}),'legacy'),1);
assert.equal(reserve(contract({total:30001,deposit:null,paid:15000}),'legacy'),0);
assert.equal(reserve(contract({total:30001,deposit:null,paid:15001}),'legacy'),1);
assert.equal(reserve(contract({deposit:null})),0);
for(const deposit of [0,-1,50001])assert.equal(reserve(contract({deposit})),0);
for(const change of [{paid:0},{kind:'Saldo'},{reversed:true},{stage:'Qualificação'},{active:0},{owner:'other'}])assert.equal(reserve(contract(change)),0);
const split=contract({paid:10000});db.prepare("INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,confirmation,evidence,kind,created) VALUES('split','owner',?,10000,'Confirmado','Teste','Sinal','2026-10-21')").run(split);assert.equal(reserve(split),1);assert.equal(reserve(split),0);
db.prepare("UPDATE offer_seats SET active=0 WHERE contract_id=?").run(split);assert.equal(reserve(split),1);
db.prepare("UPDATE site_offers SET status='closed' WHERE id='new'").run();assert.equal(reserve(contract()),0);
assert.equal(validDepositPolicy('contract_deposit'),true);assert.equal(validDepositPolicy('40'),false);
assert.equal(offerDepositTerms('legacy_50').depositPercent,50);assert.equal(offerDepositTerms('contract_deposit').depositPercent,null);assert.throws(()=>offerDepositTerms('unknown'));
db.close();console.log('PASS: migração preserva oferta legada, sinal contratual de R$200, limites, estornos, isolamento, reativação e dados financeiros intactos.');
