import json
from tests.backend.base import BaseBackendTest

class TestNotificationsEndpoints(BaseBackendTest):
    def test_notifications_list(self):
        response = self.request("/api/v1/notifications?limit=10", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("items", body["data"])
        
    def test_notifications_unread_count(self):
        response = self.request("/api/v1/notifications/unread-count", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("count", body["data"])
