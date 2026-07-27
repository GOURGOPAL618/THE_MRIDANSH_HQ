import json
from tests.backend.base import BaseBackendTest

class TestEarthEndpoints(BaseBackendTest):
    def test_bookmarks_flow(self):
        # 1. Fetch current list
        response = self.request("/api/v1/earth/bookmarks", method="GET")
        self.assertEqual(response.status, 200)
        body = json.loads(response.read().decode())
        initial_count = len(body["data"])

        # 2. Add a new bookmark
        bookmark_data = {
            "name": "JCC HQ Terminal Site",
            "latitude": 20.2961,
            "longitude": 85.8245,
            "altitude": 50000.0
        }
        response_add = self.request("/api/v1/earth/bookmarks", method="POST", data=bookmark_data)
        self.assertEqual(response_add.status, 200)
        body_add = json.loads(response_add.read().decode())
        self.assertTrue(body_add["success"])
        bookmark_id = body_add["data"]["id"]

        # 3. Fetch list again to check count increment
        response_after = self.request("/api/v1/earth/bookmarks", method="GET")
        body_after = json.loads(response_after.read().decode())
        self.assertEqual(len(body_after["data"]), initial_count + 1)

        # 4. Clean up / Delete bookmark
        response_del = self.request(f"/api/v1/earth/bookmarks/{bookmark_id}", method="DELETE")
        self.assertEqual(response_del.status, 200)
