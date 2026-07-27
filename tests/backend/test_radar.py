import json
from tests.backend.base import BaseBackendTest

class TestRadarEndpoints(BaseBackendTest):
    def test_radar_targets_list(self):
        response = self.request("/api/v1/radar/targets", method="GET")
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIsInstance(body["data"], list)
        if len(body["data"]) > 0:
            target = body["data"][0]
            self.assertIn("designation", target)
            self.assertIn("bearing", target)
            self.assertIn("distance", target)
