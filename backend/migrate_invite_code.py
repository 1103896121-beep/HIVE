import sqlite3
import os

db_path = r'e:\workrooten\Hive\backend\hive.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE squads ADD COLUMN invite_code VARCHAR(10)")
        conn.commit()
        print("Successfully added invite_code column to squads table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column invite_code already exists.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {db_path}")
