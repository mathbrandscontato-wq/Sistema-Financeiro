// Existing offers keep the original 50% rule until an owner explicitly changes it.
export const DEPOSIT_POLICIES=['legacy_50','contract_deposit'];
export function validDepositPolicy(value){return DEPOSIT_POLICIES.includes(value);}
export function offerDepositTerms(policy){
 if(policy==='legacy_50')return {depositPolicy:policy,depositPercent:50,depositTerms:'Sinal confirmado de pelo menos 50% do contrato.'};
 if(policy==='contract_deposit')return {depositPolicy:policy,depositPercent:null,depositTerms:'Sinal definido no contrato aprovado, com recebimento confirmado pela Math Brands.'};
 throw new Error('Política de sinal inválida.');
}
