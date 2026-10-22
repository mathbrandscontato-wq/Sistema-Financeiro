import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import {processCommercialQueues} from '../lib/prospecting/server.mjs';
import {createProtectionSnapshot} from '../lib/protection';

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response=runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    if(request.method==='POST'&&['/api/whatsapp','/api/finance'].includes(new URL(request.url).pathname)){
      return Promise.resolve(response).then(result=>{
        if(result.ok)ctx.waitUntil(processCommercialQueues(env,{beforeWrite:async()=>{await createProtectionSnapshot(env.COMMERCIAL_OWNER||env.INTAKE_OWNER||'','Antes de encaminhar conversa comercial');}}).catch(()=>{}));
        return result;
      });
    }
    return response;
  },
};
