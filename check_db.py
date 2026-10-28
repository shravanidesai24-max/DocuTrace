import sqlite3, os

db = 'docutrace.db'
exists = os.path.exists(db)
print(f"DB File exists: {exists}")
print(f"DB Path: {os.path.abspath(db)}")

if exists:
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"  {table}: {cur.fetchone()[0]} rows")
    conn.close()
else:
    print("Database has not been created yet (will be created on first server start).")
