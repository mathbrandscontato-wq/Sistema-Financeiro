import {env} from 'cloudflare:workers';
import {createProtectionSnapshot} from './protection';
import {CRMError,validateMutationId,requireRevision} from './crm.mjs';
import {validateManualQualification} from './markteam.mjs';
import {stableId} from './commercial-import.mjs';

// Grava apenas revisão humana. Sem inferência de prioridade nem envio de mensagem.
export async function reviewLead(owner:string,actor:string,body:unknown){
  if(!env.DB||!env.BUCKET)throw new CRMError('Proteção ou banco indisponível. Nada foi alterado.',503);
  const input=body as {mutationId:string,id:string,revision:number,qualification:unknown};
  validateMutationId(input?.mutationId);
  if(typeof body?.id!=='string'||!/^[-a-zA-Z0-9]{1,120}$/.test(input.id))throw new CRMError('Oportunidade inválida.');
  let clean:ReturnType<typeof validateManualQualification>;
  try{clean=validateManualQualification(input.qualification);}catch(e){throw new CRMError(e instanceof Error?e.message:'Classificação inválida.');}
  const db=env.DB,historyId=await stableId(owner,'markteam-qualification',input.mutationId);
  const readPrevious=async()=>db.prepare('SELECT opportunity_id,data FROM commercial_history WHERE id=? AND owner=?').bind(historyId,owner).first<{opportunity_id:string,data:string}>();
  const reuse=async()=>{const prev=await readPrevious();if(!prev)return null;const data=JSON.parse(prev.data);if(prev.opportunity_id!==input.id||data.kind!=='markteam_qualification'||JSON.stringify(data.qualification)!==JSON.stringify(clean))throw new CRMError('Esta revisão já foi enviada com outro conteúdo.',409);return {ok:true,id:input.id,reused:true};};
  const previous=await reuse();if(previous)return previous;
  const row=await db.prepare('SELECT * FROM commercial_opportunities WHERE id=? AND owner=?').bind(input.id,owner).first<{id:string,owner:string,revision:number,archived:number}>();
  requireRevision(row,owner,input.revision);
  if(row.archived)throw new CRMError('Restaure a oportunidade antes de classificá-la.',409);
  const at=new Date().toISOString();
  const detail=JSON.stringify({kind:'markteam_qualification',qualification:clean,reviewedBy:actor,reviewedAt:at,method:'manual',model:'markteam-v2.1'});
  await createProtectionSnapshot(owner,'Antes de registrar avaliação comercial manual');
  try{
    const result=await db.batch([
      db.prepare('UPDATE commercial_opportunities SET revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=? AND archived=0').bind(at,input.id,owner,input.revision),
      db.prepare('INSERT INTO commercial_history(id,owner,opportunity_id,action,data,created) SELECT ?,owner,id,?,?,? FROM commercial_opportunities WHERE id=? AND owner=? AND revision=? AND changes()=1').bind(historyId,'Classificação comercial revisada',detail,at,input.id,owner,input.revision+1)
    ]);
    if(result[0].meta.changes!==1||result[1].meta.changes!==1)throw new CRMError('A oportunidade mudou. Recarregue os dados antes de salvar.',409);
  }catch(e){
    const committed=await reuse();if(committed)return committed;
    if(e instanceof CRMError)throw e;
    throw new CRMError('Não foi possível salvar a classificação. Nenhuma mensagem foi enviada.',503);
  }
  return {ok:true,id:input.id};
}
