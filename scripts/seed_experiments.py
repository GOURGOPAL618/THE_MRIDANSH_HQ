import sqlite3
import uuid
import json
from datetime import datetime

def seed_database():
    print("=== Seeding Experiments Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='experiments';")
    if not cursor.fetchone():
        print("ERROR: 'experiments' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Seed data definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "title": "Reactor Plasma Integrity Sweep",
            "objective": "Scan the magnetic boundary layers of the engine plume during simulated step-up ignition sweeps.",
            "status": "draft",
            "notes": {
                "category": "Propulsion",
                "target_thrust": 80.0,
                "nozzle_yaw": 0.0,
                "nozzle_pitch": 0.0,
                "duration_seconds": 30,
                "observations": "Standby for simulation activation."
            }
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Sat-08A Signal Propagation Sweep",
            "objective": "Verify microwave beam frequency shifts under simulated weather perturbations.",
            "status": "draft",
            "notes": {
                "category": "Satellites",
                "target_thrust": 0.0,
                "nozzle_yaw": 0.0,
                "nozzle_pitch": 0.0,
                "duration_seconds": 20,
                "observations": "Ready to run telemetry scans."
            }
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Argon2 Clearance Decryption Scan",
            "objective": "Run security decryption logs sweeps under iteration bounds to test command line key clearances.",
            "status": "draft",
            "notes": {
                "category": "Security",
                "target_thrust": 0.0,
                "nozzle_yaw": 0.0,
                "nozzle_pitch": 0.0,
                "duration_seconds": 15,
                "observations": "Draft status."
            }
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Gimbal TVC Angle Sweep",
            "objective": "Run nozzle gimbals offset sweeps to calibrate vector deviations at peak thrust levels.",
            "status": "draft",
            "notes": {
                "category": "Propulsion",
                "target_thrust": 50.0,
                "nozzle_yaw": 3.0,
                "nozzle_pitch": -2.5,
                "duration_seconds": 60,
                "observations": "Draft status."
            }
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by title
        cursor.execute("SELECT id FROM experiments WHERE title = ?", (record["title"],))
        if cursor.fetchone():
            print(f"  Experiment '{record['title']}' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO experiments (id, title, objective, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["title"],
                record["objective"],
                record["status"],
                json.dumps(record["notes"]),
                now,
                now
            )
        )
        inserted += 1
        print(f"  Seeded: {record['title']}")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} experiments.")

if __name__ == "__main__":
    seed_database()
