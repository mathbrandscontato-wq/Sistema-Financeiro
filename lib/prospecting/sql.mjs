// SQL statements shared by D1 and real SQLite integration tests.
// Account is the commercial WhatsApp account, never a worker/operator/campaign ID.
export const RESERVE_SQL=`INSERT INTO prospecting_outreach(account,local_day,recipient,attempt_key,status,created)
 SELECT ?,?,?,?,'reserved',? WHERE
 NOT EXISTS(SELECT 1 FROM prospecting_outreach WHERE account=? AND recipient=?)
 AND (SELECT COUNT(*) FROM prospecting_outreach WHERE account=? AND local_day=?)<10
 ON CONFLICT DO NOTHING`;
export const CLAIM_SQL=`INSERT INTO prospecting_runs(owner,local_day,status,token,attempt,lease_until,report)
 VALUES(?,?,'running',?,1,?,'{}') ON CONFLICT(owner,local_day) DO UPDATE SET
 status='running',token=excluded.token,attempt=prospecting_runs.attempt+1,lease_until=excluded.lease_until
 WHERE prospecting_runs.status<>'complete' AND prospecting_runs.lease_until<?`;
export const FINISH_SQL=`UPDATE prospecting_runs SET status=?,report=?,lease_until=0 WHERE owner=? AND local_day=? AND token=? AND status='running'`;
