/** Regression checks for the Markteam V4 correction; synthetic events only. */
import assert from 'node:assert/strict';
import {followUpChoices} from '../../lib/markteam.mjs';
import {proposalEvidence} from '../../lib/leads.mjs';

const at='2026-10-16T15:00:00Z';
const stage=(id,when,before,after)=>({
 id,created:when,opportunity_id:'opportunity-test',
 data:JSON.stringify({kind:'opportunity_updated',before:{stage:before},after:{stage:after}})
});
const proposal=stage('a-start',at,'Qualificação','Proposta enviada');
const negotiation=stage('b-answer','2026-10-17T15:00:00Z','Proposta enviada','Negociação');
const waiting=stage('c-wait','2026-10-18T15:00:00Z','Negociação','Aguardando resposta');
const sameTimestamp=stage('z-later',at,'Proposta enviada','Negociação');
assert.equal(proposalEvidence([proposal],'opportunity-test').proposalFollowUpEligible,true);
assert.equal(proposalEvidence([proposal,negotiation],'opportunity-test').proposalFollowUpEligible,false);
assert.equal(proposalEvidence([waiting,proposal,negotiation],'opportunity-test').proposalFollowUpEligible,false);
assert.equal(proposalEvidence([proposal,sameTimestamp],'opportunity-test').proposalFollowUpEligible,false);
assert.equal(proposalEvidence([proposal,negotiation],'opportunity-unknown').proposalFollowUpEligible,false);
const lead={id:'opportunity-test',stage:'Proposta enviada',archived:0,captured:at,proposalSentAt:at,proposalFollowUpEligible:true};
assert.deepEqual(followUpChoices(lead,{today:'2026-10-16'}).map(x=>x.overdue),[false,false,false]);
assert.deepEqual(followUpChoices(lead,{today:'2026-11-01'}).map(x=>x.overdue),[true,true,false]);
assert.equal(followUpChoices({...lead,stage:'Recusado'},{today:'2026-11-01'}).length,0);
assert.equal(followUpChoices({...lead,next_action_on:'2026-11-01'},{today:'2026-11-01'}).length,0);
assert.throws(()=>followUpChoices(lead,{today:'2026-00-00'}));
console.log('PASS: followups determinísticos, negociação, timestamps iguais, atrasos, bloqueios.');
