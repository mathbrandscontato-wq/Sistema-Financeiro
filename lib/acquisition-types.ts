// DTO consumed by AcquisitionPanel from /api/acquisition and formMetrics.
// Revenue is omitted by the server for roles without financial access.
export type MetricKey='leads'|'qualified'|'proposals'|'customers'|'commercialRate';
export type AcquisitionMetrics=Record<MetricKey,number>&{
  won:number;sessions:number;starts:number;completed:number;abandoned:number;
  contracted?:number;received?:number;
};
export type AcquisitionLead={
  id:string;created:string;form:string;stage:string;title:string;
  archived:boolean;next_action:string|null;next_action_on:string|null;
};
export type AcquisitionData={
  total:AcquisitionMetrics;previous?:AcquisitionMetrics;
  timeline:(AcquisitionMetrics&{day:string})[];
  channels:(AcquisitionMetrics&{channel:string})[];
  forms:(AcquisitionMetrics&{slug:string})[];
  stageDistribution:{stage:string;count:number}[];
  leads?:AcquisitionLead[];notice:string;canManage:boolean;
  config:{abandon_minutes:number;attribution_days:number};
  offer:{available:number;seat_limit:number;price_cents:number;status:'open'|'closed';revision:number};
  candidates:{id:string;title:string}[];
  seats:{id:string;title:string;active:number;contract_id:string}[];
  offerHistory:{created:string;action:string;data:string}[];
};
export type OfferMutation=
  |{action:'confirm'|'release';contractId:string;reason:string}
  |{action:'configure';priceCents:number;status:'open'|'closed';abandonMinutes:number;attributionDays:number;reason:string};
