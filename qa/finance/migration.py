import sqlite3,pathlib
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
files=sorted(f for f in pathlib.Path('drizzle').glob('*.sql') if int(f.name[:4])<=4)
for f in files[:-1]:c.executescript(f.read_text())
c.execute("INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES('client','owner','marca','Marca','2026-10-09','2026-10-09')")
c.execute("INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES('opp','owner','client','Projeto','Fechado','2026-10-09','2026-10-09')")
c.execute("INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,status,payment_knowledge,reference_date,created) VALUES('contract','owner','opp',15000,'Confirmado na planilha','unknown','2026-10-09','2026-10-09')")
c.execute("INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,paid_on,confirmation,evidence,created) VALUES('receipt','owner','contract',7500,NULL,'Planilha','{\"source\":\"original\"}','2026-10-09')")
c.commit();before=c.execute('SELECT * FROM commercial_contracts').fetchone();payment=c.execute('SELECT * FROM commercial_payments').fetchone();c.executescript(files[-1].read_text())
assert c.execute('SELECT id,owner,opportunity_id,amount_cents,status,payment_knowledge,confirmed_on,reference_date,created FROM commercial_contracts').fetchone()==before
assert c.execute('SELECT id,owner,contract_id,amount_cents,paid_on,reference_date,confirmation,evidence,created FROM commercial_payments').fetchone()==payment
assert c.execute('SELECT revision,billing,active,deposit_cents,deposit_due,balance_due,terms FROM commercial_contracts').fetchone()==(1,0,1,None,None,None,None)
assert c.execute('SELECT kind,reversed_on,reversal_reason FROM commercial_payments').fetchone()==('Sinal',None,None)
print('PASS: atualização do banco preserva contratos, valores, evidências e ausência de datas existentes.')
