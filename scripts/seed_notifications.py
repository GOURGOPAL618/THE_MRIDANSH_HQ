import sqlite3
import uuid
from datetime import datetime

def seed_database():
    print("=== Seeding Centralized Notification Center Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications';")
    if not cursor.fetchone():
        print("ERROR: 'notifications' table does not exist. Run Alembic migrations first.")
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

    # Seed notifications definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "type": "security",
            "title": "Commander Session Started",
            "message": "Commander authenticated successfully from terminal IP 127.0.0.1.",
            "is_read": 1
        },
        {
            "id": str(uuid.uuid4()),
            "type": "engine",
            "title": "Engine Ignition Success",
            "message": "AETHER Reactor Core ignition sequence initiated. Magnetic containment lock engaged.",
            "is_read": 0
        },
        {
            "id": str(uuid.uuid4()),
            "type": "warning",
            "title": "Reactor Temperature Warning",
            "message": "Containment core temperature approaching 950K limits under active thrust.",
            "is_read": 0
        },
        {
            "id": str(uuid.uuid4()),
            "type": "critical",
            "title": "Reactor Thermal Overheat Spike",
            "message": "THERMAL SAFETY INTERLOCK OVERRIDE ACTIVE! Automatic containment stop triggered.",
            "is_read": 0
        },
        {
            "id": str(uuid.uuid4()),
            "type": "dataset",
            "title": "Satellites Catalog Synchronized",
            "message": "Telemetry dataset registered catalog coordinates: AETHER Fusion Core Heat Telemetry.",
            "is_read": 0
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by message
        cursor.execute("SELECT id FROM notifications WHERE message = ?", (record["message"],))
        if cursor.fetchone():
            print(f"  Notification '{record['message'][:40]}...' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO notifications (id, commander_id, timestamp, type, title, message, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                commander_id,
                now,
                record["type"],
                record["title"],
                record["message"],
                record["is_read"]
            )
        )
        inserted += 1
        print(f"  Seeded: {record['title']}...")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} database notification logs.")

if __name__ == "__main__":
    seed_database()
