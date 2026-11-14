import assert from 'node:assert/strict';
import {test} from 'node:test';
import {signRequest,verifyRequestSignature,PROTOCOL_VERSION} from '../lib/ritmo-v44/protocol.mjs';
import {projectContractStatus} from '../lib/ritmo-v44/contract-status.mjs';
const secret='integration-secret-for-tests-only-length-64-DO-NOT-DEPLOY';
const timestamp='1794500000';
const args={method:'GET',path:'/api/ritmo-v44/contract?v='+PROTOCOL_VERSION+'&organizationId=org-a&contractId=contract-1',timestamp,body:''};
test('HMAC signs the exact URL, method and body, no fake success',async()=>{
 const signature=await signRequest(secret,args);
 assert.match(signature,/^sha256=[a-f0-9]{64}$/);
 assert.equal(await verifyRequestSignature(secret,{...args,signature,nowSeconds:Number(timestamp)}),true);
 assert.equal(await verifyRequestSignature(secret,{...args,path:args.path+'&contractId=other',signature,nowSeconds:Number(timestamp)}),false);
 assert.equal(await verifyRequestSignature(secret,{...args,method:'POST',signature,nowSeconds:Number(timestamp)}),false);
 assert.equal(await verifyRequestSignature('different-secret-for-tests-only-length-64-DO-NOT-DEPLOY',{...args,signature,nowSeconds:Number(timestamp)}),false);
});
test('replay protection rejects timestamp more than 5 minutes stale',async()=>{
 const signature=await signRequest(secret,args);
 assert.equal(await verifyRequestSignature(secret,{...args,signature,nowSeconds:Number(timestamp)+301}),false);
 assert.equal(await verifyRequestSignature(secret,{...args,signature,nowSeconds:Number(timestamp)-301}),false);
});
const contract=(values={})=>({id:'contract-1',owner:'owner-1',active:1,status:'Confirmado',deposit_cents:20000,amount_cents:50000,revision:3,...values});
const opportunity=(values={})=>({id:'op-1',client_id:'client-finance-a',service:'Identidade Visual',stage:'Fechado',...values});
const payment=(id,amount,kind='Sinal',values={})=>({id,owner:'owner-1',contract_id:'contract-1',amount_cents:amount,paid_on:'2026-11-12',confirmation:'Confirmado',reversed_on:null,kind,created:'2026-11-12T13:00:00Z',...values});
test('only confirmed, unreversed ledger receipts satisfy approved deposit threshold',()=>{
 const c=contract(),o=opportunity();
 const one=projectContractStatus(c,o,[payment('pay-1',10000)]);
 assert.equal(one.deposit.state,'pending');
 const full=projectContractStatus(c,o,[payment('pay-1',10000),payment('pay-2',10000,'Sinal',{created:'2026-11-12T13:05:00Z'})]);
 assert.equal(full.deposit.state,'confirmed');
 assert.equal(full.deposit.receiptId,'pay-2');
 assert.equal(full.final.state,'pending');
 assert.equal('amountCents' in full,false);
 assert.equal('deposit_cents' in full,false);
});
test('reversal or unconfirmed receipt does not trigger a deposit',()=>{
 const status=projectContractStatus(contract(),opportunity(),[
  payment('pay-1',20000,'Sinal',{reversed_on:'2026-11-13'}),
  payment('pay-2',20000,'Sinal',{confirmation:'Pendente'})
 ]);
 assert.equal(status.deposit.state,'pending');
});
test('approved contract and closed opportunity are required',()=>{
 for(const c of [contract({active:0}),contract({status:'Rascunho'})]){
  const s=projectContractStatus(c,opportunity(),[payment('p',50000)]);
  assert.equal(s.status,'not_approved');assert.equal(s.deposit.state,'pending');
 }
 const bad=projectContractStatus(contract(),opportunity({stage:'Negociação'}),[payment('p',50000)]);
 assert.equal(bad.status,'not_approved');
});
test('final condition includes all receipts, never unchecked amount from caller',()=>{
 const s=projectContractStatus(contract(),opportunity(),[
  payment('p1',20000),
  payment('p2',30000,'Quitação',{created:'2026-11-12T13:07:00Z'})
 ]);
 assert.equal(s.deposit.state,'confirmed');assert.equal(s.final.state,'confirmed');
 assert.equal(s.final.receiptId,'p2');
});
test('owner and contract isolation rejects foreign ledger rows',()=>{
 const s=projectContractStatus(contract(),opportunity(),[
  payment('foreign-owner',999999,'Sinal',{owner:'other'}),
  payment('foreign-contract',999999,'Sinal',{contract_id:'contract-other'})
 ]);
 assert.equal(s.deposit.state,'pending');
});
