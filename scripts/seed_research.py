import sqlite3
import uuid
import json
from datetime import datetime

def seed_database():
    print("=== Seeding Research Vault Development Mock Data ===")
    
    db_path = "mridansh.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='research';")
    if not cursor.fetchone():
        print("ERROR: 'research' table does not exist. Run Alembic migrations first.")
        conn.close()
        return

    # Seed data definitions
    seed_records = [
        {
            "id": str(uuid.uuid4()),
            "title": "AETHER Fusion Core Cooldown Protocols",
            "category": "Propulsion",
            "description": "Standard operating procedure detailing containment field adjustments during step-down cooldown gimbals. Ensure magnetic locking remains active until temperature drops below 350 Kelvin to prevent structural core distortion.",
            "tags": ["Propulsion", "AETHER", "Thermal"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Cesium Map Coordinate Offset Corrections",
            "category": "Astrodynamics",
            "description": "Mathematical correction offsets for mapping day/night shadow borders on the interactive WebGL globe viewer. Resolves WGS-84 coordinate deviations relative to the solar rays position vectors.",
            "tags": ["Astrodynamics", "Cesium", "GIS"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Commander Vault Clearance Hashing",
            "category": "Security",
            "description": "Detailed cryptographic specifications regarding the Argon2ID key derivation parameters. Establishes memory costs, iterations, and parallel lanes used to encrypt commander clearance levels.",
            "tags": ["Security", "Argon2", "Credentials"]
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Gimbal TVC Thrust Vector Equations",
            "category": "Cybernetics",
            "description": "Control loop feedback mathematics calculating thrust vector gimbals offsets (Yaw / Pitch) relative to actual telemetry fuel flows. Resolves nozzle vector deviations at 60Hz iterations.",
            "tags": ["Cybernetics", "Gimbal", "TVC"]
        }
    ]

    inserted = 0
    for record in seed_records:
        # Check if already exists by title
        cursor.execute("SELECT id FROM research WHERE title = ?", (record["title"],))
        if cursor.fetchone():
            print(f"  Note '{record['title']}' already exists, skipping.")
            continue
            
        now = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO research (id, title, category, description, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["title"],
                record["category"],
                record["description"],
                json.dumps(record["tags"]),
                now,
                now
            )
        )
        inserted += 1
        print(f"  Seeded: {record['title']}")
        
    conn.commit()
    conn.close()
    print(f"Successfully seeded {inserted} research documents.")

if __name__ == "__main__":
    seed_database()
