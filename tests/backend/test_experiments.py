import json
from tests.backend.base import BaseBackendTest

class TestExperimentsEndpoints(BaseBackendTest):
    def test_experiments_list(self):
        response = self.request("/api/v1/experiments", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIsInstance(body["data"], list)
        if len(body["data"]) > 0:
            exp = body["data"][0]
            self.assertIn("name", exp)
            self.assertIn("status", exp)
            self.assertIn("progress", exp)
