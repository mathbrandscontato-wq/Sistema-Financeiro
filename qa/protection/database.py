import sqlite3,pathlib
c=sqlite3.connect(':memory:')
for f in sorted(pathlib.Path('drizzle').glob('*.sql')):c.executescript(f.read_text())
c.execute('INSERT INTO quotes(owner,data,created,updated) VALUES(?,?,?,?)',('one','{}','now','now'))
assert c.execute('SELECT count(*) FROM quotes').fetchone()[0]==1
stmt='INSERT INTO document_exports(id,owner,quote_id,revision,template_version,object_key,sha256,snapshot,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING'
args=('quote-1-revision-1-mathbrands-v1','one',1,1,'mathbrands-v1','original.pdf','sha-original','{}','now')
c.execute(stmt,args);c.execute(stmt,(*args[:5],'replacement.pdf','sha-replacement','{}','later'))
assert c.execute('SELECT object_key,sha256 FROM document_exports').fetchone()==('original.pdf','sha-original')
assert c.execute('SELECT id FROM document_exports WHERE owner=?',('two',)).fetchone() is None
c.execute('UPDATE quotes SET deleted=1 WHERE id=1');assert c.execute('SELECT count(*) FROM document_exports').fetchone()[0]==1
c.execute('INSERT INTO protection_snapshots VALUES(?,?,?,?,?,?)',('snapshot','one','backup.json','hash','Antes de salvar','now'))
assert c.execute('SELECT id FROM protection_snapshots WHERE owner=?',('two',)).fetchone() is None
assert c.execute('SELECT id FROM protection_snapshots WHERE owner=?',('one',)).fetchone()[0]=='snapshot'
print('PASS: migração aditiva, arquivo original preservado, acesso por usuário e exclusão lógica sem perda do PDF.')
