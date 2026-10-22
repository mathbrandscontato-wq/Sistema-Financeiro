import {emailURL} from '../leads.mjs';
import {normalizeRecipient,OFFER} from './policy.mjs';
// A draft for a private, verified CRM URL. This function never sends e-mail.
export function handoffDraft({recipient,recipientVerified=false,crmUrl,allowedCRMOrigin,customer,briefing,pix,payment,pending,nextAction}){
 if(!recipientVerified||!emailURL(recipient))throw new Error('owner_email_unverified');
 const url=new URL(crmUrl),allowed=new URL(allowedCRMOrigin);
 if(url.protocol!=='https:'||url.origin!==allowed.origin||url.username||url.password)throw new Error('invalid_crm_url');
 const phone=normalizeRecipient(customer.phone);
 const clean=v=>String(v||'Não informado').replace(/[\r\n]/g,' ').slice(0,500);
 return {mode:'draft',to:recipient,subject:'Math Brands | Interessado no Projeto Especial — '+clean(customer.company),
 text:[`Cliente: ${clean(customer.name)}`,`Empresa: ${clean(customer.company)}`,`Segmento: ${clean(customer.segment)}`,`WhatsApp: https://wa.me/${phone}`,`Resumo: ${clean(customer.summary)}`,
 `Condições padrão: R$ ${OFFER.totalCents/100}; sinal R$ ${OFFER.depositCents/100}; saldo R$ ${OFFER.balanceCents/100} na entrega validada.`,
 `Briefing: ${clean(briefing)}`,`Pix: ${clean(pix)}`,`Pagamento: ${clean(payment)}`,`Pendências: ${clean(pending)}`,`CRM privado: ${url.href}`,`Próxima ação: ${clean(nextAction)}`].join('\n')};
}
