import json
from tests.backend.base import BaseBackendTest

class TestDatasetsEndpoints(BaseBackendTest):
    def test_datasets_registry(self):
        response = self.request("/api/v1/datasets", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIsInstance(body["data"], list)
        if len(body["data"]) > 0:
            dataset = body["data"][0]
            self.assertIn("dataset_name", dataset)
            self.assertIn("category", dataset)
            self.assertIn("source", dataset)
            self.assertIn("location", dataset)
