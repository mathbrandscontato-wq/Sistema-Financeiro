import {localClock} from './policy.mjs';
// BRL micros are operator-approved conservative estimates, not provider invoices.
export function createBudgetGuard({db,owner,attemptPrefix,limitMicros,clock=()=>new Date().toISOString()}){
 let sequence=0;
 return async ({provider,costMicros})=>{
  if(typeof attemptPrefix!=='string'||!attemptPrefix||attemptPrefix.length>160||typeof provider!=='string'||provider.length>80||!Number.isSafeInteger(limitMicros)||limitMicros<=0||!Number.isSafeInteger(costMicros)||costMicros<=0)return false;
  const now=clock(),day=localClock(now).day,attempt=attemptPrefix+':'+sequence++;
  const r=await db.prepare(`INSERT INTO prospecting_costs(owner,day,provider,attempt,cost_micros,created) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT SUM(cost_micros) FROM prospecting_costs WHERE owner=? AND day=?),0)+?<=? ON CONFLICT DO NOTHING`).bind(owner,day,provider,attempt,costMicros,now,owner,day,costMicros,limitMicros).run();
  return r.meta.changes===1;
 };
}
