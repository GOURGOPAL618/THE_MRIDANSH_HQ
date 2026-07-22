import sqlite3
import uuid
from datetime import datetime

def seed_database():
    print("=== Seeding Activity Logs Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='logs';")
    if not cursor.fetchone():
        print("ERROR: 'logs' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Seed data definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "module": "auth",
            "action": "login",
            "description": "Commander successfully authenticated from IP 127.0.0.1. Session registered to browser client.",
            "severity": "info"
        },
        {
            "id": str(uuid.uuid4()),
            "module": "engine",
            "action": "ignition",
            "description": "AETHER Reactor Core warmup ignition sweep successfully initiated by Commander.",
            "severity": "info"
        },
        {
            "id": str(uuid.uuid4()),
            "module": "engine",
            "action": "throttle",
            "description": "Nozzle gimbal TVC angles adjusted. Target yaw: 1.5°, pitch: -2.0° under 85.0% manual throttle.",
            "severity": "info"
        },
        {
            "id": str(uuid.uuid4()),
            "module": "radar",
            "action": "target_lock",
            "description": "Unidentified high-velocity debris detected in gimbal orbit sector scan. Warning alarm signals active.",
            "severity": "warning"
        },
        {
            "id": str(uuid.uuid4()),
            "module": "datasets",
            "action": "register_dataset",
            "description": "Aerospace dataset registered successfully to vault: AETHER Fusion Core Heat Telemetry.",
            "severity": "info"
        },
        {
            "id": str(uuid.uuid4()),
            "module": "engine",
            "action": "emergency_stop",
            "description": "REACTOR CORE THERMAL SPIKE EXCEEDS BOUNDS! Automatic safety stop triggered, magnetic locking disengaged.",
            "severity": "error"
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by description
        cursor.execute("SELECT id FROM logs WHERE description = ?", (record["description"],))
        if cursor.fetchone():
            print(f"  Log '{record['description'][:40]}...' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO logs (id, timestamp, module, action, description, severity)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                now,
                record["module"],
                record["action"],
                record["description"],
                record["severity"]
            )
        )
        inserted += 1
        print(f"  Seeded: {record['description'][:50]}...")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} activity logs.")

if __name__ == "__main__":
    seed_database()
