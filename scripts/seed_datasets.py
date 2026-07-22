import sqlite3
import uuid
from datetime import datetime

def seed_database():
    print("=== Seeding Datasets Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='datasets';")
    if not cursor.fetchone():
        print("ERROR: 'datasets' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Seed data definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "dataset_name": "AETHER Fusion Core Heat Telemetry",
            "category": "Propulsion",
            "source": "AETHER Reactor Temperature Sensors",
            "description": "Real-time records tracking fusion core chamber temperatures, cooling values, and pressure states during ignition sweeps.",
            "location": "D:/storage/datasets/aether_heat.log"
        },
        {
            "id": str(uuid.uuid4()),
            "dataset_name": "Sat-08A Orbital Tracks",
            "category": "Satellites",
            "source": "Astrodynamics Orbital Tracking Rays",
            "description": "Concentric circular orbits log coordinate datasets tracking satellite bearings, elevation angles, and coordinates offsets.",
            "location": "D:/storage/datasets/sat08a_orbits.csv"
        },
        {
            "id": str(uuid.uuid4()),
            "dataset_name": "Commander Session Audits",
            "category": "Security",
            "source": "Commander headquarters vault activity logger",
            "description": "System logins, security locks, and command transition logs recording timestamps and IP details.",
            "location": "D:/storage/datasets/commander_audits.json"
        },
        {
            "id": str(uuid.uuid4()),
            "dataset_name": "Gimbal TVC Angle Telemetry",
            "category": "Propulsion",
            "source": "Propulsion gimbals sensors telemetry",
            "description": "Thrust vector coordinate yaw and pitch deviations logged at 60Hz during active thrust cycles.",
            "location": "D:/storage/datasets/propulsion_gimbal.log"
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by name
        cursor.execute("SELECT id FROM datasets WHERE dataset_name = ?", (record["dataset_name"],))
        if cursor.fetchone():
            print(f"  Dataset '{record['dataset_name']}' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO datasets (id, dataset_name, category, source, description, location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["dataset_name"],
                record["category"],
                record["source"],
                record["description"],
                record["location"],
                now
            )
        )
        inserted += 1
        print(f"  Seeded: {record['dataset_name']}")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} datasets.")

if __name__ == "__main__":
    seed_database()
