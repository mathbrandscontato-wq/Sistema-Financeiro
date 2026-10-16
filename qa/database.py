import sqlite3,pathlib,json
c=sqlite3.connect(':memory:');c.executescript(pathlib.Path('drizzle/0000_third_sentinel.sql').read_text());
for owner in ['one','one','two']:
 c.execute('INSERT INTO quotes(owner,data,created,updated) VALUES(?,?,?,?)',(owner,'{}','now','now'))
assert [r[0] for r in c.execute('SELECT id FROM quotes WHERE owner=?',('one',))]==[1,2]
assert c.execute('SELECT id FROM quotes WHERE id=1 AND owner=?',('two',)).fetchone() is None
c.execute('UPDATE quotes SET deleted=1 WHERE id=2');c.execute('INSERT INTO quotes(owner,data,created,updated) VALUES(?,?,?,?)',('one','{}','now','now'));assert c.execute('SELECT max(id) FROM quotes').fetchone()[0]==4
update='UPDATE quotes SET data=?,revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=?'
audit='INSERT INTO events(quote_id,owner,action,data,created) SELECT id,owner,?,?,? FROM quotes WHERE id=? AND owner=? AND revision=? AND changes()=1'
c.execute(update,('{"status":"Aprovado"}','now',1,'one',1));c.execute(audit,('Atualizado','{}','now',1,'one',2));assert c.execute('SELECT count(*) FROM events').fetchone()[0]==1
c.execute(update,('{}','now',1,'one',1));c.execute(audit,('Conflito','{}','now',1,'one',2));assert c.execute('SELECT count(*) FROM events').fetchone()[0]==1
print('PASS: migração, isolamento por usuário, sequência sem reutilização, atualização concorrente e auditoria.')
