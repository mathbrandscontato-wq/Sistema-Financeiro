import sqlite3,json,sys,pathlib
request=json.load(sys.stdin);db=sqlite3.connect(request['path']);db.row_factory=sqlite3.Row;db.execute('PRAGMA foreign_keys=ON')
if request.get('initialize'):
 for f in sorted(pathlib.Path('drizzle').glob('*.sql')):db.executescript(f.read_text())
changes=[]
if request.get('statements'):
 try:
  db.execute('BEGIN')
  for s in request['statements']:changes.append(db.execute(s['sql'],s['args']).rowcount)
  db.commit()
 except Exception as error:
  db.rollback();print(json.dumps({'error':str(error)}));sys.exit(0)
result={'changes':changes} if request.get('returnChanges') else {}
for key,q in request.get('queries',{}).items():result[key]=[dict(row) for row in db.execute(q['sql'],q.get('args',[]))]
if request.get('commitQueries'):db.commit()
print(json.dumps(result));db.close()
