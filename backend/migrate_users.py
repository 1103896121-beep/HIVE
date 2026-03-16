import sqlite3
import os

db_path = r'e:\workrooten\Hive\backend\hive.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add apple_sub to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN apple_sub VARCHAR(255)")
        print("Added apple_sub column to users table.")
    except sqlite3.OperationalError as e:
        print(f"users.apple_sub: {e}")

    # 2. Add trial_start_at to users
    try:
        # SQLite DATETIME default current_timestamp
        cursor.execute("ALTER TABLE users ADD COLUMN trial_start_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        print("Added trial_start_at column to users table.")
    except sqlite3.OperationalError as e:
        print(f"users.trial_start_at: {e}")

    # 3. Add subscription_end_at to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN subscription_end_at DATETIME")
        print("Added subscription_end_at column to users table.")
    except sqlite3.OperationalError as e:
        print(f"users.subscription_end_at: {e}")

    conn.commit()
    conn.close()
else:
    print(f"Database not found at {db_path}")
