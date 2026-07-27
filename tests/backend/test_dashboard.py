import json
from tests.backend.base import BaseBackendTest

class TestDashboardEndpoints(BaseBackendTest):
    def test_get_dashboard_telemetry(self):
        response = self.request("/api/v1/system/dashboard", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("system_status", body["data"])
        self.assertIn("mission_stats", body["data"])
        self.assertIn("module_status", body["data"])
        self.assertIn("recent_activity", body["data"])
