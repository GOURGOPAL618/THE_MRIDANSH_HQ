import json
from tests.backend.base import BaseBackendTest

class TestSearchEndpoints(BaseBackendTest):
    def test_global_search(self):
        # Search query string checking
        response = self.request("/api/v1/search?q=nominal", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("items", body["data"])
        self.assertIn("total", body["data"])
