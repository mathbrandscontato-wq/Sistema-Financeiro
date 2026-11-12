/**
 * Read-only projection of Financeiro ledger for Ritmo.
 * No browser-supplied amounts; no mutation of commercial contracts/payments.
 */
const validDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
function crossing(rows,threshold){
 if(!Number.isSafeInteger(threshold)||threshold<=0)return null;
 let total=0;
 for(const row of rows){
  total+=row.amount_cents;
  if(total>=threshold)return {receiptId:row.id,confirmedAt:row.created,paidOn:row.paid_on||null};
 }
 return null;
}
export function projectContractStatus(contract,opportunity,payments){
 if(!contract||!opportunity||!Array.isArray(payments))throw Error('Contrato não encontrado.');
 const approved=contract.active===1&&contract.status==='Confirmado'&&opportunity.stage==='Fechado';
 const authorized=payments.filter(p=>p.contract_id===contract.id
  &&p.owner===contract.owner&&p.confirmation==='Confirmado'&&p.reversed_on==null
  &&Number.isSafeInteger(p.amount_cents)&&p.amount_cents>0&&validDate(p.created))
  .sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
 const deposit=crossing(authorized.filter(x=>x.kind==='Sinal'),contract.deposit_cents);
 const final=crossing(authorized,contract.amount_cents);
 return {
  contractId:contract.id,
  commercialClientId:opportunity.client_id,
  status:approved?'approved':'not_approved',
  serviceLabel:opportunity.service||'',
  contractRevision:contract.revision,
  deposit:approved&&deposit?{state:'confirmed',...deposit,verification:'finance_ledger'}:{state:'pending'},
  final:approved&&final?{state:'confirmed',...final,verification:'finance_ledger'}:{state:'pending'},
 };
}
