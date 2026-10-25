// Artificial regression dataset, independent of data/commercial-reference.json.
// Technical import keys preserve coverage of the legacy offer reconciliation.
const row=(externalKey,client,amountCents,depositCents,stage,paymentKnowledge='confirmed',paidOn=null)=>({
 externalKey,client,amountCents,depositCents,stage,paymentKnowledge,paidOn,
 sourceBalanceCents:amountCents-depositCents,paymentLabel:depositCents?'Sinal recebido':'',
 segment:'Segmento fictício',origin:'Fixture local',projectStage:'',briefing:'Briefing fictício',
 nextAction:'Revisar fixture',notes:'Registro artificial para QA',row:externalKey
});
export const commercialFixture={
 schemaVersion:1,namespace:'qa-synthetic',sourceName:'synthetic-qa',sourceSheet:'QA',
 sourceSha256:'b'.repeat(64),referenceDate:'2026-10-09',
 rows:[row('lavander-ceramicas','Empresa Fictícia Alfa',15000,7500,'Fechado'),
 row('consultoria-ambiental','Empresa Fictícia Beta',30000,15000,'Fechado','confirmed','2026-10-09'),
 row('revisao-blog-ricardo','Empresa Fictícia Gama',50000,0,'Fechado','unknown'),
 row('qa-delta','Empresa Fictícia Delta',20000,0,'Acompanhamento','unknown'),
 row('qa-epsilon','Empresa Fictícia Épsilon',30000,0,'Aguardando resposta','unknown')]
};
