import {integer,sqliteTable,text,primaryKey,uniqueIndex,index} from 'drizzle-orm/sqlite-core';

export const prospectingAccounts=sqliteTable('prospecting_accounts',{
 owner:text('owner').primaryKey(),account:text('account').notNull(),dryRun:integer('dry_run').notNull().default(1),killSwitch:integer('kill_switch').notNull().default(1),config:text('config').notNull().default('{}'),revision:integer('revision').notNull().default(1),updated:text('updated').notNull()
},t=>[uniqueIndex('prospecting_account_identity').on(t.account)]);
export const prospectingConsents=sqliteTable('prospecting_consents',{
 owner:text('owner').notNull(),recipient:text('recipient').notNull(),channel:text('channel').notNull(),brand:text('brand').notNull(),purpose:text('purpose').notNull(),evidence:text('evidence').notNull(),grantedAt:text('granted_at').notNull(),expiresAt:text('expires_at'),revokedAt:text('revoked_at'),optOut:integer('opt_out').notNull().default(0),updated:text('updated').notNull()
},t=>[primaryKey({columns:[t.owner,t.recipient]})]);
export const prospectingConversations=sqliteTable('prospecting_conversations',{
 owner:text('owner').notNull(),recipient:text('recipient').notNull(),opportunityId:text('opportunity_id'),paused:integer('paused').notNull().default(0),optedOut:integer('opted_out').notNull().default(0),lastInbound:text('last_inbound'),lastRealInbound:text('last_real_inbound'),lastSimulatedInbound:text('last_simulated_inbound'),lockToken:text('lock_token'),lockUntil:integer('lock_until').notNull().default(0),revision:integer('revision').notNull().default(1),created:text('created').notNull(),updated:text('updated').notNull()
},t=>[primaryKey({columns:[t.owner,t.recipient]}),index('prospecting_conversation_queue').on(t.owner,t.paused,t.updated)]);
export const prospectingInbox=sqliteTable('prospecting_inbox',{
 account:text('account').notNull(),eventId:text('event_id').notNull(),owner:text('owner').notNull(),recipient:text('recipient').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),sourceMode:text('source_mode').notNull().default('unverified'),simulated:integer('simulated').notNull().default(1),state:text('state').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),token:text('token'),leaseUntil:integer('lease_until').notNull().default(0),errorCode:text('error_code'),created:text('created').notNull(),processed:text('processed')
},t=>[primaryKey({columns:[t.account,t.eventId]}),index('prospecting_inbox_queue').on(t.owner,t.state,t.created)]);
export const prospectingOutbox=sqliteTable('prospecting_outbox',{
 owner:text('owner').notNull(),key:text('key').notNull(),account:text('account').notNull(),recipient:text('recipient').notNull(),channel:text('channel').notNull(),payload:text('payload').notNull(),sourceMode:text('source_mode').notNull().default('unverified'),simulated:integer('simulated').notNull().default(1),state:text('state').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),token:text('token'),leaseUntil:integer('lease_until').notNull().default(0),nextAttempt:integer('next_attempt').notNull().default(0),providerId:text('provider_id'),errorCode:text('error_code'),created:text('created').notNull(),updated:text('updated').notNull()
},t=>[primaryKey({columns:[t.owner,t.key]}),index('prospecting_outbox_queue').on(t.owner,t.state,t.nextAttempt)]);
