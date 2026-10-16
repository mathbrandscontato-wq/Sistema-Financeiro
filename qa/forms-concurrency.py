import sqlite3,tempfile,pathlib,threading,concurrent.futures,subprocess,json
queries=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CONFIRM_SEAT_SQL,SITE_SUBMISSION_SQL} from './lib/offer-sql.mjs';console.log(JSON.stringify({seat:CONFIRM_SEAT_SQL,submission:SITE_SUBMISSION_SQL}))"],text=True))
with tempfile.TemporaryDirectory() as folder:
 path=folder+'/db.sqlite'
 db=sqlite3.connect(path)
 for f in sorted(pathlib.Path('drizzle').glob('*.sql')):db.executescript(f.read_text())
 db.execute("INSERT INTO commercial_clients(id,owner,identity_key,display_name,created,updated) VALUES('client','owner','client','Teste','2026-10-11','2026-10-11')")
 db.execute("INSERT INTO site_offers(id,owner,opened) VALUES('offer','owner','2026-10-11')")
 for i in range(11):
  db.execute("INSERT INTO commercial_opportunities(id,owner,client_id,title,stage,created,updated) VALUES(?, 'owner','client','Teste','Fechado','2026-10-11','2026-10-11')",('op'+str(i),))
  db.execute("INSERT INTO commercial_contracts(id,owner,opportunity_id,amount_cents,status,payment_knowledge,created) VALUES(?, 'owner',?,30000,'Confirmado','confirmed','2026-10-11')",('c'+str(i),'op'+str(i)))
  db.execute("INSERT INTO commercial_payments(id,owner,contract_id,amount_cents,confirmation,evidence,created) VALUES(?, 'owner',?,15000,'Confirmado','Teste','2026-10-11')",('p'+str(i),'c'+str(i)))
  if i<9:db.execute("INSERT INTO offer_seats(id,owner,offer_id,contract_id,created) VALUES(?, 'owner','offer',?,'2026-10-11')",('seat'+str(i),'c'+str(i)))
 db.commit()
 barrier=threading.Barrier(2)
 def occupy(i):
  conn=sqlite3.connect(path,timeout=10);barrier.wait()
  try:
   conn.execute('BEGIN IMMEDIATE')
   result=conn.execute(queries['seat'],('seat'+str(i),'2026-10-11','offer','owner','c'+str(i)))
   conn.commit();return 'ok' if result.rowcount else 'seat_full'
  except sqlite3.IntegrityError as e:conn.rollback();return str(e)
  finally:conn.close()
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(occupy,[9,10]))
 assert results.count('ok')==1 and results.count('seat_full')==1,results
 assert db.execute('SELECT COUNT(*) FROM offer_seats WHERE active=1').fetchone()[0]==10
 # Direct insert is blocked after closing, even if the page saw earlier availability.
 db.execute("INSERT INTO intake_forms(id,owner,slug,version,definition,created) VALUES('form','owner','sites-projeto-especial',1,'{}','2026-10-11')");db.commit()
 result=db.execute(queries['submission'],('sub','owner','form','r','t','{}','{}','{}','2026-10-11','2026-10-20','sites-projeto-especial','owner'))
 assert result.rowcount==0
 print('PASS: duas conexões concorrentes disputam a última vaga, uma única confirmação, limite íntegro e bloqueio transacional de formulário encerrado.')
