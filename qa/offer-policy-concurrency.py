from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sqlite3, tempfile, re

root=Path(__file__).resolve().parents[1]
sql=re.search(r'CONFIRM_SEAT_SQL=`(.*?)`;', (root/'lib/offer-sql.mjs').read_text(encoding='utf-8'), re.S)[1]
(root/'work').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=root/'work') as directory:
    path=Path(directory)/'seats.sqlite'
    db=sqlite3.connect(path)
    for migration in sorted((root/'drizzle').glob('*.sql')):
        db.executescript(migration.read_text(encoding='utf-8'))
    db.execute("INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES('c','owner','c','Teste','2026-10-21','2026-10-21')")
    db.execute("INSERT INTO site_offers(id,owner,opened,seat_limit,deposit_policy) VALUES('offer','owner','2026-10-21',1,'contract_deposit')")
    for i in range(20):
        db.execute("INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES(?,'owner','c','Teste','Fechado','2026-10-21','2026-10-21')",(f'o{i}',))
        db.execute("INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,deposit_cents,status,payment_knowledge,created) VALUES(?,'owner',?,50000,20000,'Confirmado','confirmed','2026-10-21')",(f'ct{i}',f'o{i}'))
        db.execute("INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,confirmation,evidence,kind,created) VALUES(?,'owner',?,20000,'Confirmado','Teste','Sinal','2026-10-21')",(f'p{i}',f'ct{i}'))
    db.commit()
    before=list(db.execute('SELECT * FROM commercial_payments'))
    def reserve(i):
        conn=sqlite3.connect(path,timeout=20)
        try:
            result=conn.execute(sql,(f'seat{i}','2026-10-21','offer','owner',f'ct{i}'))
            conn.commit()
            return result.rowcount
        finally:
            conn.close()
    with ThreadPoolExecutor(max_workers=20) as pool:
        assert sum(pool.map(reserve,range(20)))==1
    assert db.execute('SELECT COUNT(*) FROM offer_seats WHERE active=1').fetchone()[0]==1
    assert list(db.execute('SELECT * FROM commercial_payments'))==before
    db.close()
print('PASS: 20 contratos com sinal R$200 disputam uma vaga; somente uma reserva; pagamentos intactos.')
