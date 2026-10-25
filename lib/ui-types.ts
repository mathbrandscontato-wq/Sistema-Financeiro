import type {CommercialRecords,CommercialClientsRow,CommercialOpportunitiesRow,CommercialContractsRow,CommercialPaymentsRow,FinancialQuoteReceiptsRow,EventsRow,WorkspaceMembersRow,PaymentEventInboxRow,DocumentExportsRow,ProtectionSnapshotsRow} from './db-types';
export type ApiError={error?:string};
export type MutationResult=ApiError&{ok?:boolean;id:string;report?:{conflicts?:{reason:string}[]}};
export type Confirmation={title:string;text:string;label:string;action:()=>void|Promise<void>};
export type CRMData=ApiError&{records:Partial<CommercialRecords>;team:{email:string}[];publicIntakeUrl:string|null};
export type CRMEditor={kind:'client';record:CommercialClientsRow|null}|{kind:'opportunity';record:CommercialOpportunitiesRow|null;clientId?:string};
export type QuotePayment={id:string;cents:number;date:string;note:string;recorded?:string};
export type QuoteLine={name?:string;description:string;qty:string;unit:string;mode:string};
export type QuoteSettings={company:string;issuer:string;bank:string;beneficiary:string;key:string;pix:string};
export type Quote={
 id?:number;revision?:number;number?:string;created?:string;updated?:string;
 client:string;company:string;email:string;phone:string;issued:string;valid:string;
 rows:QuoteLine[];discount:string;discountMode:string;notes:string;terms:string;deadline:string;
 status:string;billing:boolean;payments:QuotePayment[];settings?:QuoteSettings;
 financialContractId?:string;contractFinancialStatus?:string;
};
export type SavedQuote=Quote&{id:number;revision:number};
export type WorkspaceData=ApiError&{quotes:SavedQuote[];settings:QuoteSettings;events:EventsRow[]};
export type TeamData=ApiError&{role:string;email:string;permissions:string[];members:WorkspaceMembersRow[];paymentApiEnabled:boolean};
export type PaymentEventsData=ApiError&{events:PaymentEventInboxRow[];enabled:boolean};
export type ProtectionData=ApiError&{snapshots:ProtectionSnapshotsRow[];exports:DocumentExportsRow[]};
export type FinanceData=ApiError&{records:Partial<CommercialRecords>};
export type PendingQuotePayment=QuotePayment&{quoteId:number;quoteNumber:string};
export type FinanceSource=Partial<CommercialPaymentsRow&PendingQuotePayment>;
export type FinanceEditor={mode:string;source?:FinanceSource};
export type FinanceFormState={
 amount?:string;opportunityId?:string;confirmedOn?:string;deposit?:string;depositDue?:string;
 balanceDue?:string;terms?:string;reason?:string;billing?:boolean;active?:boolean;
 paidOn?:string;kind?:string;note?:string;existingPaymentId?:string;confirmed?:boolean;
};
export type FinanceProps={mode:string;record?:CommercialContractsRow|null;opportunities:(CommercialOpportunitiesRow&{clientName?:string})[];payments:CommercialPaymentsRow[];mappings:FinancialQuoteReceiptsRow[];source?:FinanceSource;busy:boolean;execute:(body:unknown)=>Promise<MutationResult>;onSaved:(out:MutationResult)=>void;onCancel:()=>void;onDirty:()=>void};
export type FinanceMutation={id?:string;revision?:number;mutationId:string;action?:string;contract?:FinanceFormState;opportunityId?:string;payment?:FinanceFormState;paymentId?:string;reason?:string;note?:string;quoteId?:number;quotePaymentId?:string;existingPaymentId?:string|null};
export type DocumentCommand=
 |{type:'text';x:number;y:number;size:number;color:string;weight:string;space:number;value:string}
 |{type:'image';x:number;y:number;src:string;w:number;h:number}
 |{type:'box';x:number;y:number;w:number;h:number;color:string;radius?:number;border?:string};
export type PreparedQuoteDocument={pages:DocumentCommand[][];width:number;height:number;bytes:Uint8Array<ArrayBufferLike>};
export type QuoteMutationResult=ApiError&{id:number;report?:{conflicts?:{reason:string}[]}};
