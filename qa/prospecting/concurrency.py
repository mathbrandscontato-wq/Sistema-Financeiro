"""Real independent SQLite connections contend for the exact reservation statement."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sqlite3, tempfile, re

root = Path(__file__).resolve().parents[2]
sql = re.search(r'RESERVE_SQL=`(.*?)`;', (root/'lib/prospecting/sql.mjs').read_text(), re.S)[1]
(root/'work').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=root/'work') as directory:
    path = Path(directory)/'quota.sqlite'
    db = sqlite3.connect(path)
    db.executescript((root/'drizzle/0010_prospecting_offline.sql').read_text())
    db.close()
    def reserve(i):
        conn = sqlite3.connect(path, timeout=20)
        try:
            phone = f'55479999{i:05d}'
            conn.execute(sql, ('account','2026-10-21',phone,f'key{i}','2026-10-21T13:30:00Z','account',phone,'account','2026-10-21'))
            conn.commit()
        finally:
            conn.close()
    with ThreadPoolExecutor(max_workers=20) as pool:
        list(pool.map(reserve, range(100)))
    conn = sqlite3.connect(path)
    assert conn.execute('SELECT COUNT(*) FROM prospecting_outreach').fetchone()[0] == 10
    conn.close()
print('PASS: 100 competing attempts across 20 connections reserve exactly 10 recipients.')
