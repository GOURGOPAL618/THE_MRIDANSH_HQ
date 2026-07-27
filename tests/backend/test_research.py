import json
from tests.backend.base import BaseBackendTest

class TestResearchEndpoints(BaseBackendTest):
    def test_research_papers_query(self):
        response = self.request("/api/v1/research", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIsInstance(body["data"], list)
        if len(body["data"]) > 0:
            paper = body["data"][0]
            self.assertIn("title", paper)
            self.assertIn("category", paper)
            self.assertIn("tags", paper)
