import sqlite3
import uuid
from datetime import datetime

def seed_database():
    print("=== Seeding Security Center Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='security_events';")
    if not cursor.fetchone():
        print("ERROR: 'security_events' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Seed data definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "event": "firewall_port_scan",
            "risk_level": "high",
            "details": "Suspicious TCP port sweep detected on external telemetry receiver coordinates console."
        },
        {
            "id": str(uuid.uuid4()),
            "event": "gimbal_deviation_anomaly",
            "risk_level": "medium",
            "details": "TVC nozzle gimbal yaw offset exceeded safety threshold during active engine throttle sweeps."
        },
        {
            "id": str(uuid.uuid4()),
            "event": "unauthorized_override_attempt",
            "risk_level": "critical",
            "details": "Attempt to disengage engine emergency safety locks without commander recovery credentials."
        },
        {
            "id": str(uuid.uuid4()),
            "event": "database_backup_synchronized",
            "risk_level": "low",
            "details": "Secure backup of aerospace dataset index catalog synced to auxiliary node."
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by details
        cursor.execute("SELECT id FROM security_events WHERE details = ?", (record["details"],))
        if cursor.fetchone():
            print(f"  Security Event '{record['details'][:40]}...' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO security_events (id, timestamp, event, risk_level, details)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                now,
                record["event"],
                record["risk_level"],
                record["details"]
            )
        )
        inserted += 1
        print(f"  Seeded: {record['details'][:50]}...")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} security events.")

if __name__ == "__main__":
    seed_database()
