import os
import sys
import time
import subprocess
import unittest
import socket

# Add project root directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Force isolated test database
os.environ["DATABASE_URL"] = "sqlite:///./test_mridansh.db"

def seed_test_db():
    print("Initializing isolated test database schemas...")
    from backend.database.session import Base, engine, SessionLocal
    from backend.models.models import Commander, Settings
    from backend.core.security_utils import get_password_hash
    
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Seed commander
    db = SessionLocal()
    try:
        hashed_pw = get_password_hash("@mridansh1607x")
        commander = Commander(
            username="commander",
            email="commander@mridansh.org",
            hashed_password=hashed_pw,
            role="commander"
        )
        db.add(commander)
        db.commit()
        db.refresh(commander)
        
        # Add default settings record
        settings_record = Settings(
            commander_id=commander.id,
            theme="default",
            volume=0.5,
            is_muted=False,
            notifications_enabled=True,
            performance_mode="quality",
            accent_color=None,
            panel_opacity=0.85,
            glow_intensity=1.0,
            animation_speed=1.0,
            border_radius="4px",
            font_size="14px"
        )
        db.add(settings_record)
        db.commit()
        print("Test database seeded successfully.")
    except Exception as e:
        print(f"Error seeding test DB: {e}")
        sys.exit(1)
    finally:
        db.close()
        engine.dispose()

def wait_for_port(port, timeout=10):
    start_time = time.time()
    while True:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (socket.timeout, ConnectionRefusedError):
            if time.time() - start_time > timeout:
                return False
            time.sleep(0.5)

def run_tests():
    # 1. Seed database
    seed_test_db()
    
    # 2. Start test server in background
    print("Launching test uvicorn server on port 8002...")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./test_mridansh.db"
    
    # Run uvicorn on port 8002
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8002"],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for server to start
    if not wait_for_port(8002):
        print("Error: Test server failed to start within timeout.")
        server_process.terminate()
        sys.exit(1)
        
    print("Test server is online. Executing backend automated testing suite...")
    
    # 3. Discover and run unittest suite
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=os.path.join(os.path.dirname(__file__), "backend"), pattern="test_*.py")
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 4. Cleanup
    print("Stopping test uvicorn server...")
    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
        
    # Delete SQLite test file
    test_db_path = "./test_mridansh.db"
    if os.path.exists(test_db_path):
        try:
            os.remove(test_db_path)
            print("Cleaned up isolated test database file.")
        except Exception as e:
            print(f"Warning: Could not remove test database file: {e}")
            
    # Exit with non-zero if tests failed
    if not result.wasSuccessful():
        print("=== BACKEND TESTING SUITE FAILED ===")
        sys.exit(1)
    else:
        print("=== BACKEND TESTING SUITE PASSED SUCCESSFULLY ===")
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
