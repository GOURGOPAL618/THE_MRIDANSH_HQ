import json
from tests.backend.base import BaseBackendTest

class TestEngineEndpoints(BaseBackendTest):
    def test_get_engine_status(self):
        response = self.request("/api/v1/engine/status", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("engine_state", body["data"])
        self.assertIn("thrust_level", body["data"])
        self.assertIn("temperature", body["data"])

    def test_trigger_lockdown_emergency(self):
        # 1. Ignite the engine first to transition out of shutdown state
        self.request("/api/v1/engine/ignite", method="POST")
        
        # 2. Trigger emergency stop
        response = self.request("/api/v1/engine/emergency-stop", method="POST")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["engine_state"], "emergency_stop")
        
        # 3. Reset the engine back to standby shutdown state for subsequent tests
        self.request("/api/v1/engine/reset", method="POST")
