import json
from tests.backend.base import BaseBackendTest

class TestLogsEndpoints(BaseBackendTest):
    def test_logs_pagination(self):
        response = self.request("/api/v1/logs?limit=5&skip=0", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIsInstance(body["data"]["items"], list)
        self.assertLessEqual(len(body["data"]["items"]), 5)
        
        if len(body["data"]["items"]) > 0:
            log_item = body["data"]["items"][0]
            self.assertIn("module", log_item)
            self.assertIn("severity", log_item)
            self.assertIn("description", log_item)
