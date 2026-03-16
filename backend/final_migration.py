import sqlite3
import os

db_path = r'e:\workrooten\Hive\backend\hive.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add status to squad_members
    try:
        cursor.execute("ALTER TABLE squad_members ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'")
        print("Added status column to squad_members table.")
    except sqlite3.OperationalError as e:
        print(f"squad_members.status: {e}")

    # 2. Add show_location to profiles
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN show_location BOOLEAN DEFAULT 1")
        print("Added show_location column to profiles table.")
    except sqlite3.OperationalError as e:
        print(f"profiles.show_location: {e}")

    conn.commit()
    conn.close()
else:
    print(f"Database not found at {db_path}")
