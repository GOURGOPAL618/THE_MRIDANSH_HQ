import json
import urllib.request
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestAuthEndpoints(BaseBackendTest):
    def test_login_success(self):
        login_data = {"username": "commander", "password": "@mridansh1607x"}
        response = self.request("/api/v1/auth/login", method="POST", data=login_data, auth=False)
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("data", body)

    def test_login_invalid(self):
        login_data = {"username": "commander", "password": "wrong_password"}
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, auth=False)
        self.assertEqual(ctx.exception.status, 401)

    def test_unauthenticated_request(self):
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/settings", method="GET", auth=False)
        self.assertEqual(ctx.exception.status, 401)
