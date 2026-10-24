import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createTavilySearchProvider,normalizeTavilyQuery} from '../../lib/prospecting/tavily-search.mjs';
import {ProspectingStore} from '../../lib/prospecting/store.mjs';
import {createCommercialAgent} from '../../lib/prospecting/agent.mjs';

const now='2026-10-22T22:40:00.000Z',clock=()=>now;
const config={enabled:true,approved:true,approvalRef:'fixture-owner-approval',costMode:'free_only',estimatedCostMicros:0,freePlanVerified:true,freePlanReviewThrough:'2026-11-15T00:00:00.000Z',apiKey:'secret-test-fixture',timeoutMs:100,clock};
const original='site:instagram.com "fotógrafo" "Joinville"';
const markets=JSON.parse(readFileSync(new URL('../../data/prospecting-markets.json',import.meta.url),'utf8'));
const queries=markets.flatMap(m=>m.queries);assert.equal(queries.length,90);
for(const query of queries){const normalized=normalizeTavilyQuery(query);assert.equal(normalized.originalQuery,query);assert.ok(normalized.providerQuery);assert.equal(normalized.providerQuery.includes('site:'),false);assert.equal(normalized.filterTranslation.mode,query.includes('site:')?'restrict':'none');}
assert.equal(normalizeTavilyQuery('  '+original+'  ').originalQuery,'  '+original+'  ');
const linked=normalizeTavilyQuery('site:linkedin.com/company/ "consultoria" "Joinville"');
assert.equal(linked.filterTranslation.value,'linkedin.com/company/');assert.equal(linked.filterTranslation.pathPrefix,'/company/');assert.equal(linked.providerQuery,'"consultoria" "Joinville"');

for(const query of ['',null,'site:instagram.com','site:instagram.com " "','site:instagram.com "unterminated','site:instagram.com OR site:linkedin.com "a"','site:instagram.com -site:linkedin.com "a"','site:*.instagram.com a','site:https://instagram.com a','site:user:pass@instagram.com a','site:instagram.com:443 a','site:127.0.0.1 a','site:2130706433 a','site:localhost a','site:a.local a','site:instagram.com/company/../ a','site:instagram.com/company/%2e%2e/ a','site:instagram.com/company/?x=1 a','site:instagram.com a OR b','site:instagram.com a AND b','site:instagram.com -a','site:instagram.com inurl:a','site:instagram.com (a)','site:instagram.com a\nsecret'])assert.throws(()=>normalizeTavilyQuery(query),e=>['invalid_tavily_query','unsupported_tavily_query'].includes(e.code),String(query));

function fixture(overrides={},behavior={}){
 const calls=[],reservations=[],pauses=[];
 const payload=behavior.payload??{usage:{credits:1},results:[{url:'https://www.instagram.com/fotografo/?tracking=discard#discard',title:'Página fictícia de fotógrafo',content:'NEVER_PERSIST_CONTENT',raw_content:'NEVER_PERSIST_RAW',phone:'NEVER_PERSIST_PHONE',score:.99}],answer:'NEVER_PERSIST_ANSWER',images:['NEVER_PERSIST_IMAGE']};
 const provider=createTavilySearchProvider({...config,...overrides},{clock,async reserveBudget(value){reservations.push(value);return behavior.grant!==false;},async onUnexpectedUsage(value){pauses.push(value);if(behavior.pauseThrows)throw new Error('private pause detail');},async fetchImpl(url,options){calls.push({url,options});if(behavior.fetch) return behavior.fetch(url,options);return new Response(JSON.stringify(payload),{status:behavior.status||200});}});
 return {provider,calls,reservations,pauses};
}

const f=fixture(),[page]=await f.provider.search(original,{now,market:'Fotógrafos'});
assert.equal(f.calls.length,1);assert.equal(f.reservations.length,1);assert.deepEqual(f.reservations[0],{provider:'tavily_search',costMicros:0});
assert.equal(f.calls[0].url,'https://api.tavily.com/search');assert.equal(f.calls[0].options.method,'POST');assert.equal(f.calls[0].options.redirect,'error');assert.equal(f.calls[0].options.headers.Authorization,'Bearer secret-test-fixture');
assert.deepEqual(JSON.parse(f.calls[0].options.body),{query:'"fotógrafo" "Joinville"',search_depth:'basic',auto_parameters:false,include_answer:false,include_raw_content:false,include_images:false,include_image_descriptions:false,include_favicon:false,max_results:5,include_usage:true,topic:'general',country:'brazil',language:'portuguese',include_domains:['instagram.com'],include_domains_mode:'restrict',exact_match:true});
assert.equal(page.profileUrl,'https://www.instagram.com/fotografo');assert.match(page.publicId,/^tavily_[a-f0-9]{64}$/);assert.equal(page.candidateType,'web_page');assert.equal(page.companyVerified,false);assert.equal(page.activityVerified,false);assert.equal(page.locationVerified,false);assert.equal(page.consent,null);assert.equal(page.reviewed,false);assert.equal(page.persistenceAllowed,false);assert.equal(page.metadataPersistenceApprovalRef,null);assert.deepEqual(page.evidence,[{url:page.profileUrl,fact:'URL retornada por busca programática; conteúdo, identidade e atividade não verificados.',verifiedAt:now,observedAt:now,verificationScope:'search_result_received',verified:false,reviewed:false}]);assert.ok(Object.values(page.criteria).every(n=>n===0));assert.equal(page.provenance.originalQuery,original);assert.equal(page.provenance.providerQuery,'"fotógrafo" "Joinville"');assert.equal(page.provenance.verified,false);
assert.equal(JSON.stringify(page).includes('NEVER_PERSIST'),false);for(const key of ['content','raw_content','answer','images','score','phone'])assert.equal(Object.hasOwn(page,key),false);
const [same]=await f.provider.search(original);assert.equal(same.publicId,page.publicId);
const withoutOperator=fixture(),plainQuery=queries.find(query=>!query.includes('site:'));
await withoutOperator.provider.search(plainQuery);
const plainRequest=JSON.parse(withoutOperator.calls[0].options.body);assert.equal(plainRequest.query,plainQuery);assert.equal(Object.hasOwn(plainRequest,'include_domains'),false);assert.equal(Object.hasOwn(plainRequest,'include_domains_mode'),false);assert.equal(plainRequest.search_depth,'basic');assert.equal(plainRequest.auto_parameters,false);
for(const query of queries){
 const transport=fixture({}, {payload:{usage:{credits:1},results:[]}});await transport.provider.search(query);
 const normalized=normalizeTavilyQuery(query),body=JSON.parse(transport.calls[0].options.body);
 assert.equal(normalized.originalQuery,query);assert.equal(body.query,normalized.providerQuery);assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);assert.equal(body.exact_match,true);
 if(normalized.filterTranslation.value){assert.deepEqual(body.include_domains,[normalized.filterTranslation.value]);assert.equal(body.include_domains_mode,'restrict');}else{assert.equal(Object.hasOwn(body,'include_domains'),false);assert.equal(Object.hasOwn(body,'include_domains_mode'),false);}
}

for(const invalid of [{enabled:false},{approved:false},{approvalRef:''},{costMode:'paid'},{estimatedCostMicros:1},{freePlanVerified:false},{freePlanReviewThrough:'2026-10-01T00:00:00Z'},{freePlanReviewThrough:'2027-01-01T00:00:00Z'},{paidFallback:true},{apiKey:''},{metadataPersistenceApproved:true}]){
 const x=fixture(invalid);await assert.rejects(()=>x.provider.search(original),e=>typeof e.code==='string'&&!e.message.includes('secret'));assert.equal(x.calls.length,0);assert.equal(x.reservations.length,0);
}
const noCallback=createTavilySearchProvider(config,{clock,fetchImpl:async()=>assert.fail('network forbidden'),reserveBudget:async()=>assert.fail('reservation forbidden')});await assert.rejects(()=>noCallback.search(original),e=>e.code==='tavily_usage_guard_required');
const disabled=createTavilySearchProvider();await assert.rejects(()=>disabled.search(original),e=>e.code==='provider_disabled');
const denied=fixture({}, {grant:false});await assert.rejects(()=>denied.provider.search(original),e=>e.code==='provider_free_quota_exhausted');assert.equal(denied.calls.length,0);
const malformed=fixture();await assert.rejects(()=>malformed.provider.search('site:instagram.com OR site:linkedin.com foo'));assert.equal(malformed.calls.length,0);assert.equal(malformed.reservations.length,0);
const approved=fixture({metadataPersistenceApproved:true,metadataPersistenceApprovalRef:'fixture-metadata-review'});assert.equal((await approved.provider.search(original))[0].persistenceAllowed,true);assert.equal((await approved.provider.search(original))[0].metadataPersistenceApprovalRef,'fixture-metadata-review');
const sqlite=new DatabaseSync(':memory:');
try{
 for(const file of readdirSync(new URL('../../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'));
 const store=new ProspectingStore({prepare(sql){return {bind(...args){return {async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}};}});
 const [metadata]=await approved.provider.search(original);
 await store.saveCompany('fixture-owner','Fotógrafos',metadata,now);
 const saved=sqlite.prepare('SELECT data,score FROM prospecting_companies WHERE owner=?').get('fixture-owner');
 const persisted=JSON.parse(saved.data);assert.equal(saved.score,0);assert.equal(persisted.companyVerified,false);assert.equal(persisted.evidence[0].reviewed,false);assert.equal(persisted.evidence[0].verificationScope,'search_result_received');assert.equal(JSON.stringify(persisted).includes('NEVER_PERSIST'),false);
 await assert.rejects(()=>createCommercialAgent().draftApproach({company:persisted}),e=>e.code==='verified_context_required');
}finally{sqlite.close();}

const badURLs=['http://instagram.com/a','https://user:password@instagram.com/a','https://instagram.com.evil.com/a','https://evilinstagram.com/a','https://127.0.0.1/a','https://[::1]/a','https://2130706433/a','https://169.254.169.254/a','https://localhost/a','https://instagram.com:8443/a','https://instagram.com/a/../b','https://instagram.com/a/%2e%2e/b','https://instagram.com/a/%252e%252e/b','https://instagram.com/a/%2fb','https://instagram.com/a/%zz','https://instagram.com\\@evil.com/a','https://%69nstagram.com/a'];
for(const url of badURLs){const x=fixture({}, {payload:{usage:{credits:1},results:[{url,title:'untrusted page'}]}});assert.deepEqual(await x.provider.search(original),[],url);}
const prefixPages=['https://linkedin.com/company/ficticia','https://www.linkedin.com/company/ficticia/','https://linkedin.com/company-fake/ficticia','https://linkedin.com/Company/ficticia','https://linkedin.com/company/%2e%2e/in/person'];
const prefix=fixture({}, {payload:{usage:{credits:1},results:prefixPages.map(url=>({url,title:'untrusted LinkedIn title'}))}});assert.equal((await prefix.provider.search('site:linkedin.com/company/ "consultoria" "Joinville"')).length,2);
const dup=fixture({}, {payload:{usage:{credits:1},results:[{url:'https://instagram.com/a?x=1',title:'a'},{url:'https://instagram.com/a/#f',title:'a again'},{url:'https://instagram.com/b',title:'x'.repeat(500)}]}});const deduped=await dup.provider.search(original);assert.equal(deduped.length,2);assert.equal(deduped[1].name.length,200);assert.equal(deduped[1].pageTitle.length,300);

for(const credits of [0,2,1.5,'1',null,undefined,{secret:'NEVER_PERSIST'}]){
 const x=fixture({}, {payload:{usage:{credits},results:[]},pauseThrows:true});await assert.rejects(()=>x.provider.search(original),e=>e.code==='tavily_credit_mismatch');assert.equal(x.calls.length,1);assert.equal(x.pauses.length,1);assert.equal(x.pauses[0].provider,'tavily_search');assert.equal(JSON.stringify(x.pauses).includes('NEVER_PERSIST'),false);await assert.rejects(()=>x.provider.search(original),e=>e.code==='tavily_usage_review_required');assert.equal(x.calls.length,1);assert.equal(x.reservations.length,1);
}
const tooMany=fixture({}, {payload:{usage:{credits:1},results:Array.from({length:6},()=>({url:'https://instagram.com/a',title:'a'}))}});await assert.rejects(()=>tooMany.provider.search(original),e=>e.code==='provider_invalid_response');
const httpError=fixture({}, {status:429});await assert.rejects(()=>httpError.provider.search(original),e=>e.code==='provider_http_error'&&e.status===429);assert.equal(httpError.calls.length,1);
const transport=fixture({}, {fetch:async()=>{throw new Error('secret-test-fixture private response body');}});await assert.rejects(()=>transport.provider.search(original),e=>e.code==='provider_transport_error'&&!e.message.includes('secret')&&!JSON.stringify(e).includes('private'));
const cancelled=fixture(),abort=new AbortController();abort.abort();await assert.rejects(()=>cancelled.provider.search(original,{signal:abort.signal}),e=>e.code==='provider_request_cancelled');assert.equal(cancelled.calls.length,0);assert.equal(cancelled.reservations.length,0);
const timed=fixture({}, {fetch:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('private timeout body')),{once:true}))});await assert.rejects(()=>timed.provider.search(original),e=>e.code==='provider_transport_error');assert.equal(timed.calls.length,1);
console.log('PASS: all 90 original queries and request bodies, explicit site/domain/path translation, fixed basic one-credit requests, free-only gates, zero-cost reservation, mismatch pause, HTTPS/domain/path guards, metadata opt-in and SQLite storage without verified facts, stripped bodies and secret-safe failures; zero real network calls.');
