import json
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestErrorHandlingEndpoints(BaseBackendTest):
    def test_diagnostic_error_trigger(self):
        # Target dev triggers with type=validation query parameters (returns 422 mapped code)
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/system/errors/trigger?type=validation", method="GET")
        
        self.assertEqual(ctx.exception.status, 422)
        
        # Read and check the response body
        body = json.loads(ctx.exception.read().decode())
        self.assertFalse(body["success"])
        self.assertEqual(body["message"], "Simulated request validation failure.")
        self.assertIn("request_id", body)
        
        # Verify stack traces and technical details are never exposed to clients
        self.assertNotIn("traceback", body)
        self.assertNotIn("stack_trace", body)
        if "data" in body and body["data"] is not None:
            self.assertNotIn("traceback", body["data"])
            self.assertNotIn("stack_trace", body["data"])
