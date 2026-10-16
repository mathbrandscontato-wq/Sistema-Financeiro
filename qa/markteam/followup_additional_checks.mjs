/**
 * After Codex safely applies the proposed patch, place this file under
 * qa/markteam/followup_additional_checks.mjs and execute with Node 22+.
 * Uses only artificial events. No HTTP, D1, R2 or side effects.
 */
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
assert.equal(proposalEvidence([proposal,negotiation], 'opportunity-unknown').proposalFollowUpEligible,false);
const lead={id:'opportunity-test',stage:'Proposta enviada',archived:0,captured:at,proposalSentAt:at,proposalFollowUpEligible:true};
assert.deepEqual(followUpChoices(lead,{today:'2026-10-16'}).map(x=>x.overdue),[false,false,false]);
assert.deepEqual(followUpChoices(lead,{today:'2026-11-01'}).map(x=>x.overdue),[true,true,false]);
assert.equal(followUpChoices({...lead,stage:'Recusado'},{today:'2026-11-01'}).length,0);
assert.equal(followUpChoices({...lead,next_action_on:'2026-11-01'},{today:'2026-11-01'}).length,0);
assert.throws(()=>followUpChoices(lead,{today:'2026-00-00'}));
console.log('PASS: followups determinísticos, bloqueio após negociação, timestamps iguais, períodos vencidos, encerramento.');

const earlierTie={...sameTimestamp,id:'0-earlier'};
assert.equal(proposalEvidence([proposal,earlierTie],'opportunity-test').proposalFollowUpEligible,true);
assert.equal(proposalEvidence([sameTimestamp,proposal],'opportunity-test').proposalFollowUpEligible,false);
const intent={...negotiation,data:JSON.stringify({kind:'diagnostic_intent',intent:'conversation'})};
assert.equal(proposalEvidence([proposal,intent],'opportunity-test').proposalFollowUpEligible,false);
const renewed=stage('d-renew','2026-10-19T15:00:00Z','Aguardando resposta','Proposta enviada');
assert.equal(proposalEvidence([proposal,negotiation,waiting,renewed],'opportunity-test').proposalFollowUpEligible,true);
assert.equal(followUpChoices({...lead,archived:1}).length,0);
