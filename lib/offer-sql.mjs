// The availability predicate is part of the write statement, not an earlier read.
// D1 serializes SQL writes and batch is transactional; COUNT and insert see one state.
export const CONFIRM_SEAT_SQL=`INSERT INTO offer_seats(id,owner,offer_id,contract_id,created)
 SELECT ?,o.owner,o.id,c.id,? FROM site_offers o
 JOIN commercial_contracts c ON c.owner=o.owner
 JOIN commercial_opportunities op ON op.id=c.opportunity_id AND op.owner=c.owner
 WHERE o.id=? AND o.owner=? AND c.id=? AND o.status='open' AND c.active=1
 AND op.stage='Fechado' AND c.amount_cents>0
 AND COALESCE((SELECT SUM(p.amount_cents) FROM commercial_payments p WHERE p.owner=c.owner AND p.contract_id=c.id AND p.kind='Sinal' AND p.reversed_on IS NULL),0)*2>=c.amount_cents
 AND (SELECT COUNT(*) FROM offer_seats s WHERE s.offer_id=o.id AND s.active=1)<o.seat_limit
 ON CONFLICT(owner,contract_id) DO UPDATE SET active=1,released=NULL,reason=NULL
 WHERE offer_seats.active=0 AND offer_seats.offer_id=excluded.offer_id`;
export const SITE_SUBMISSION_SQL=`INSERT INTO intake_sessions(id,owner,form_id,request_id,token_hash,answers,diagnosis,attribution,created,expires)
 SELECT ?,?,?,?,?,?,?,?,?,? WHERE ?<>'sites-projeto-especial' OR EXISTS(
 SELECT 1 FROM site_offers o WHERE o.owner=? AND o.status='open'
 AND o.seat_limit>(SELECT COUNT(*) FROM offer_seats s WHERE s.offer_id=o.id AND s.active=1))`;
