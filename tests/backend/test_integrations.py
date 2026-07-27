import json
from tests.backend.base import BaseBackendTest

class TestIntegrationsEndpoints(BaseBackendTest):
    def test_get_integrations_list(self):
        # Correct prefix is /api/v1/integrations/status
        response = self.request("/api/v1/integrations/status", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("providers", body["data"])
        self.assertIn("global_mock_mode", body["data"])
