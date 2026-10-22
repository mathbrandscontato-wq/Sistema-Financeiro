// Executable local proof; never loads credentials or invokes a network provider.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {ProspectingStore,runResearch} from '../lib/prospecting/store.mjs';
import {consult} from '../lib/prospecting/policy.mjs';
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../drizzle/0010_prospecting_offline.sql',import.meta.url),'utf8'));
const adapter={prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};}};
const now='2026-10-21T13:30:00Z';
const report=await runResearch({store:new ProspectingStore(adapter),owner:'demo-only',now,token:'demo',markets:JSON.parse(readFileSync(new URL('../data/prospecting-markets.json',import.meta.url))),provider:{mode:'mock',async search(){return [{name:'Empresa fictícia de homologação',profileUrl:'https://example.invalid/empresa',criteria:{digitalPresence:0,activity:0,standardFit:0,decisionMaker:0,timing:0},evidence:[{url:'https://example.invalid/fonte',fact:'Dado fictício para demonstrar o fluxo',verifiedAt:now}]}];}}});
console.log(JSON.stringify({report,conversation:['Qual o preço?','Inclui loja e integração?','Quero contratar','Já paguei'].map(message=>({message,...consult(message)})),realMessages:0,financialWrites:0},null,2));
db.close();
