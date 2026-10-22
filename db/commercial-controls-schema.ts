import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const prospectingCosts=sqliteTable('prospecting_costs',{
 owner:text('owner').notNull(),day:text('day').notNull(),provider:text('provider').notNull(),attempt:text('attempt').notNull(),costMicros:integer('cost_micros').notNull(),created:text('created').notNull()
},t=>[primaryKey({columns:[t.owner,t.attempt]})]);
export const prospectingApprovals=sqliteTable('prospecting_approvals',{
 owner:text('owner').notNull(),recipient:text('recipient').notNull(),opportunityId:text('opportunity_id').notNull(),approvalRef:text('approval_ref').notNull(),approvedBy:text('approved_by').notNull(),briefingRef:text('briefing_ref').notNull(),acceptanceEvent:text('acceptance_event').notNull(),pixRef:text('pix_ref').notNull(),capacity:integer('capacity').notNull(),revoked:integer('revoked').notNull().default(0),created:text('created').notNull(),updated:text('updated').notNull()
},t=>[primaryKey({columns:[t.owner,t.recipient]})]);
