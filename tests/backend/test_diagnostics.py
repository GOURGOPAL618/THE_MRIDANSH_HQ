import json
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestDiagnosticsEndpoints(BaseBackendTest):
    def test_liveness_endpoint_public(self):
        # 1. Public liveness endpoint check (auth=False)
        response = self.request("/api/v1/system/health/liveness", method="GET", auth=False)
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["status"], "live")
        self.assertIn("timestamp", body["data"])

    def test_readiness_endpoint_unauthorized(self):
        # 2. Detailed readiness endpoint requires authentication
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/system/health/readiness", method="GET", auth=False)
        self.assertEqual(ctx.exception.status, 401)

    def test_readiness_endpoint_authorized(self):
        # 3. Detailed readiness diagnostics (auth=True)
        response = self.request("/api/v1/system/health/readiness", method="GET", auth=True)
        self.assertEqual(response.status, 200)
        
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        
        data = body["data"]
        # Assert database telemetry
        self.assertIn("database", data)
        self.assertEqual(data["database"]["status"], "operational")
        self.assertIn("query_latency_ms", data["database"])
        self.assertIn("type", data["database"])
        
        # Assert storage space stats
        self.assertIn("storage", data)
        self.assertEqual(data["storage"]["status"], "operational")
        self.assertIn("total_bytes", data["storage"])
        self.assertIn("available_bytes", data["storage"])
        
        # Assert runtime platform metrics
        self.assertIn("runtime", data)
        self.assertIn("cpu_utilization_percent", data["runtime"])
        self.assertIn("memory_usage_mb", data["runtime"])
        self.assertIn("active_threads", data["runtime"])
        
        # Assert integrations rate limits
        self.assertIn("api_connectivity", data)
        for provider in ["nasa", "weather", "ai", "github"]:
            self.assertIn(provider, data["api_connectivity"])
            self.assertIn("status", data["api_connectivity"][provider])
            self.assertIn("configured", data["api_connectivity"][provider])
            self.assertIn("rate_limit", data["api_connectivity"][provider])
            
        # Assert security logs auditing counts
        self.assertIn("security", data)
        self.assertIn("critical_security_events", data["security"])
        self.assertIn("failed_authentications_count", data["security"])
