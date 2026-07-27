import json
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestSecurityEndpoints(BaseBackendTest):
    def test_security_audit_events_list(self):
        # Correct path is /api/v1/security
        response = self.request("/api/v1/security", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("items", body["data"])
        self.assertIn("stats", body["data"])

    def test_invalid_jwt_token(self):
        headers = {"Authorization": "Bearer invalid_secret_token_12345"}
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/settings", method="GET", headers=headers, auth=False)
        self.assertEqual(ctx.exception.status, 401)
