import type {CommercialRecords,CommercialOpportunitiesRow,QuotesRow,CommercialQuoteLinksRow} from './db-types';
import {env} from 'cloudflare:workers';
import reference from '../data/commercial-reference.json';
import {planImport,reconciliation,planQuoteLink,COMMERCIAL_TABLES} from './commercial-import.mjs';
import {createProtectionSnapshot} from './protection';
export {COMMERCIAL_TABLES};
export async function readCommercial(owner:string){
 if(!env.DB)throw Error('Banco indisponível.');
 const results=await env.DB.batch(COMMERCIAL_TABLES.map(t=>env.DB!.prepare(`SELECT * FROM ${t} WHERE owner=?`).bind(owner)));
 return Object.fromEntries(COMMERCIAL_TABLES.map((t,i)=>[t,results[i].results])) as CommercialRecords;
}
export async function importReference(owner:string){
 const db=env.DB!;
 const previous=await db.prepare('SELECT report FROM commercial_import_batches WHERE owner=? AND namespace=? AND source_sha256=?').bind(owner,reference.namespace,reference.sourceSha256).first<{report:string}>();
 if(previous)return {applied:true,reused:true,report:JSON.parse(previous.report)};
 const data=await readCommercial(owner),plan=await planImport(owner,reference,{clients:data.commercial_clients,opportunities:data.commercial_opportunities,rows:data.commercial_import_rows},new Date().toISOString());
 if(plan.report.conflicts.length)return {applied:false,reused:false,report:plan.report};
 if(!plan.statements.length)return {applied:false,reused:true,report:plan.report};
 await createProtectionSnapshot(owner,'Antes da importação do histórico comercial');
 try{await db.batch(plan.statements.map((s)=>db.prepare(s.sql).bind(...s.args)));}catch(e){
 // A competing authenticated request may have committed the exact same reference.
 const committed=await db.prepare('SELECT report FROM commercial_import_batches WHERE owner=? AND namespace=? AND source_sha256=?').bind(owner,reference.namespace,reference.sourceSha256).first<{report:string}>();
 if(committed)return {applied:true,reused:true,report:JSON.parse(committed.report)};throw e;
 }
 return {applied:true,reused:false,report:plan.report};
}
export const referenceOverview=()=>({sourceName:reference.sourceName,sourceSha256:reference.sourceSha256,referenceDate:reference.referenceDate,...reconciliation(reference)});
export async function linkQuote(owner:string,opportunityId:string,quoteId:number){
 const db=env.DB!;if(typeof opportunityId!=='string'||!Number.isSafeInteger(quoteId)||quoteId<=0)throw Error('Vínculo inválido.');
 const [opportunity,quote,links]=await Promise.all([db.prepare('SELECT * FROM commercial_opportunities WHERE id=? AND owner=?').bind(opportunityId,owner).first<CommercialOpportunitiesRow>(),db.prepare('SELECT * FROM quotes WHERE id=? AND owner=? AND deleted=0').bind(quoteId,owner).first<QuotesRow>(),db.prepare('SELECT * FROM commercial_quote_links WHERE owner=?').bind(owner).all<CommercialQuoteLinksRow>()]);
 const plan=planQuoteLink(owner,opportunity,quote,links.results,new Date().toISOString());
 if(plan.length){await createProtectionSnapshot(owner,'Antes de vincular orçamento ao histórico');await db.batch(plan.map((s)=>db.prepare(s.sql).bind(...s.args)));}
 return {ok:true};
}
