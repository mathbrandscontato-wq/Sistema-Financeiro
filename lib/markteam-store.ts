import {env} from 'cloudflare:workers';
import {createProtectionSnapshot} from './protection';
import {CRMError,validateMutationId,requireRevision} from './crm.mjs';
import {validateManualQualification} from './markteam.mjs';
import {stableId} from './commercial-import.mjs';

// Grava apenas revisão humana. Sem inferência de prioridade nem envio de mensagem.
export async function reviewLead(owner:string,actor:string,body:any){
  if(!env.DB||!env.BUCKET)throw new CRMError('Proteção ou banco indisponível. Nada foi alterado.',503);
  validateMutationId(body?.mutationId);
  if(typeof body?.id!=='string'||!/^[-a-zA-Z0-9]{1,120}$/.test(body.id))throw new CRMError('Oportunidade inválida.');
  let clean:any;
  try{clean=validateManualQualification(body.qualification);}catch(e:any){throw new CRMError(e.message);}
  const db=env.DB,historyId=await stableId(owner,'markteam-qualification',body.mutationId);
  const readPrevious=async()=>db.prepare('SELECT opportunity_id,data FROM commercial_history WHERE id=? AND owner=?').bind(historyId,owner).first<any>();
  const reuse=async()=>{const prev=await readPrevious();if(!prev)return null;const data=JSON.parse(prev.data);if(prev.opportunity_id!==body.id||data.kind!=='markteam_qualification'||JSON.stringify(data.qualification)!==JSON.stringify(clean))throw new CRMError('Esta revisão já foi enviada com outro conteúdo.',409);return {ok:true,id:body.id,reused:true};};
  const previous=await reuse();if(previous)return previous;
  const row=await db.prepare('SELECT * FROM commercial_opportunities WHERE id=? AND owner=?').bind(body.id,owner).first<any>();
  requireRevision(row,owner,body.revision);
  if(row.archived)throw new CRMError('Restaure a oportunidade antes de classificá-la.',409);
  const at=new Date().toISOString();
  const detail=JSON.stringify({kind:'markteam_qualification',qualification:clean,reviewedBy:actor,reviewedAt:at,method:'manual',model:'markteam-v2.1'});
  await createProtectionSnapshot(owner,'Antes de registrar avaliação comercial manual');
  try{
    const result=await db.batch([
      db.prepare('UPDATE commercial_opportunities SET revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=? AND archived=0').bind(at,body.id,owner,body.revision),
      db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) SELECT ?,owner,id,?,?,? FROM commercial_opportunities WHERE id=? AND owner=? AND revision=? AND changes()=1').bind(historyId,'Classificação comercial revisada',detail,at,body.id,owner,body.revision+1)
    ]);
    if(result[0].meta.changes!==1||result[1].meta.changes!==1)throw new CRMError('A oportunidade mudou. Recarregue os dados antes de salvar.',409);
  }catch(e:any){
    const committed=await reuse();if(committed)return committed;
    if(e instanceof CRMError)throw e;
    throw new CRMError('Não foi possível salvar a classificação. Nenhuma mensagem foi enviada.',503);
  }
  return {ok:true,id:body.id};
}
