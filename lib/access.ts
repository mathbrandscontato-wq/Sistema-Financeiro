import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {permits} from './team-rules.mjs';
export async function workspaceAccess(permission?:string){
 const user=await getChatGPTUser();if(!user)return null;
 const owner=env.INTAKE_OWNER||user.userId;
 let role='owner';if(user.userId!==owner){const member=await env.DB!.prepare('SELECT role FROM workspace_members WHERE owner=? AND email=? AND active=1').bind(owner,user.email.toLowerCase()).first<{role:string}>();if(!member)return null;role=member.role;}
 if(permission&&!permits(role,permission))return null;
 return {...user,userId:owner,actorId:user.userId,role};
}
