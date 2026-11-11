// Threads — regras comerciais puras, sem contato ou publicação externa.
export const THREADS_STAGES = Object.freeze(['Prospecção','Qualificação','Diagnóstico','Apresentação','Proposta','Negociação','Fechamento','Pós-venda']);
export const THREADS_CRITERIA = Object.freeze(['icp','need','intent','timing','service','contact']);
export const THREADS_PRIORITY = Object.freeze({HIGH:'Alta prioridade',MEDIUM:'Média prioridade',NURTURE:'Relacionamento',OUT:'Fora do perfil'});
export const THREADS_CONTACT_STATES = Object.freeze(['Não iniciado','Abordagem em preparação','Aguardando aprovação','Aprovado','Envio em processamento','Enviado e confirmado','Falha no envio','Respondido','Interessado','Não interessado','Não contatar']);

const isText = v => typeof v === 'string' && !!v.trim();
export function normalizeThreadsUrl(value) {
  if (!isText(value)) throw new TypeError('URL pública obrigatória.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new TypeError('URL inválida.'); }
  if (url.protocol !== 'https:' || !['threads.com','www.threads.com','threads.net','www.threads.net'].includes(url.hostname.toLowerCase())) throw new TypeError('URL deve ser pública e do Threads.');
  const match = url.pathname.match(/^\/@[A-Za-z0-9._]+\/post\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) throw new TypeError('URL de publicação do Threads inválida.');
  return 'https://www.threads.com' + url.pathname.replace(/\/$/,'').toLowerCase();
}
export function publicPostKey(post) {
  if (isText(post?.postId)) return 'threads:post:' + post.postId.trim();
  return 'threads:url:' + normalizeThreadsUrl(post?.url);
}
export function assessThreadsLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Avaliação inválida.');
  const scores = input.scores;
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) throw new TypeError('As seis notas são obrigatórias.');
  const evidence = input.evidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new TypeError('Evidências por critério são obrigatórias.');
  const normalized = {};
  for (const key of THREADS_CRITERIA) {
    const score = scores[key];
    if (!Number.isInteger(score) || score < 0 || score > 2) throw new RangeError('Nota inválida: ' + key);
    if (score > 0 && !isText(evidence[key])) throw new TypeError('Nota positiva exige evidência: ' + key);
    normalized[key] = score;
  }
  const score = Object.values(normalized).reduce((a,b)=>a+b,0);
  const priority = score >= 10 ? THREADS_PRIORITY.HIGH : score >= 7 ? THREADS_PRIORITY.MEDIUM : score >= 4 ? THREADS_PRIORITY.NURTURE : THREADS_PRIORITY.OUT;
  const noContact = input.noContact === true;
  return Object.freeze({scores:Object.freeze(normalized),score,priority,noContact,eligibleForContact:!noContact && normalized.contact > 0,stage:'Prospecção',nextAction:noContact?'Não contatar': 'Revisão humana',blocker:noContact?'Restrição de contato': 'Aprovação e elegibilidade do canal'});
}
export function canFollowUp({responded=false,interested=false,refused=false,noContact=false,unansweredAttempts=0,firstApproachSent=false}={}) {
  if (refused || noContact || !Number.isInteger(unansweredAttempts) || unansweredAttempts < 0 || unansweredAttempts >= 2) return false;
  if (!firstApproachSent) return false;
  return responded === true || interested === true;
}
export function assertExternalActionAllowed({approved=false,channelAllowed=false,noContact=false,policyApproved=false}={}) {
  if (!policyApproved || !approved || !channelAllowed || noContact) throw new Error('Ação externa bloqueada: falta política, aprovação, canal autorizado ou existe restrição de contato.');
  return true;
}
