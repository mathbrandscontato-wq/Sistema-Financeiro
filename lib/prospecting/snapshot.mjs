// Called by the existing private protection snapshot; never exports another owner's rows.
export const PROSPECTING_SNAPSHOT_TABLES=['prospecting_accounts','prospecting_companies','prospecting_runs','prospecting_consents','prospecting_conversations','prospecting_inbox','prospecting_outbox','prospecting_handoffs','prospecting_approvals','prospecting_costs','prospecting_outreach'];
export function prospectingSnapshotQueries(db,owner){
 return PROSPECTING_SNAPSHOT_TABLES.map(table=>table==='prospecting_outreach'
  ?db.prepare('SELECT * FROM prospecting_outreach WHERE account IN (SELECT account FROM prospecting_accounts WHERE owner=?)').bind(owner)
  :db.prepare(`SELECT * FROM ${table} WHERE owner=?`).bind(owner));
}
