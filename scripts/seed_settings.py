import sqlite3
import uuid

def seed_database():
    print("=== Seeding Settings Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings';")
    if not cursor.fetchone():
        print("ERROR: 'settings' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Find commander account id
    cursor.execute("SELECT id FROM commanders WHERE username = 'commander';")
    commander_row = cursor.fetchone()
    if not commander_row:
        print("ERROR: 'commander' user does not exist in commanders table. Run auth seeds first.")
        conn.close()
        return
        
    commander_id = commander_row[0]

    # Check if settings already exist for this commander
    cursor.execute("SELECT id FROM settings WHERE commander_id = ?;", (commander_id,))
    if cursor.fetchone():
        print("  Settings for Commander already exist, skipping seeding.")
        conn.close()
        return
        
    settings_id = str(uuid.uuid4())
    cursor.execute(
        """
        INSERT INTO settings (id, commander_id, theme, volume, is_muted, notifications_enabled, performance_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            settings_id,
            commander_id,
            "default",
            0.5,
            0, # false
            1, # true
            "quality"
        )
    )
    conn.commit()
    conn.close()
    print("Successfully seeded cockpit settings for Commander.")

if __name__ == "__main__":
    seed_database()
