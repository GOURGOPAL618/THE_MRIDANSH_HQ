import json
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestAIEndpoints(BaseBackendTest):
    def test_query_endpoint_unauthorized(self):
        # 1. Unauthenticated request to query endpoint must return 401
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/ai/query", method="POST", data={"prompt": "hello"}, auth=False)
        self.assertEqual(ctx.exception.status, 401)

    def test_query_endpoint_authorized(self):
        # 2. Authenticated standard query request returns expected response envelope
        response = self.request(
            "/api/v1/ai/query",
            method="POST",
            data={"prompt": "Ping thermal systems stability status", "mode": "general"},
            auth=True
        )
        self.assertEqual(response.status, 200)
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("response", body["data"])
        self.assertIn("provider", body["data"])
        self.assertEqual(body["data"]["provider"], "mock")  # Test environment has GLOBAL_MOCK_MODE=True

    def test_query_endpoint_validation_oversized(self):
        # 3. Oversized prompt input is rejected with 422 (or custom ValueError 400)
        oversized = "a" * 2001
        with self.assertRaises(HTTPError) as ctx:
            self.request(
                "/api/v1/ai/query",
                method="POST",
                data={"prompt": oversized, "mode": "general"},
                auth=True
            )
        self.assertIn(ctx.exception.status, [400, 422])

    def test_query_endpoint_validation_empty(self):
        # 4. Empty prompt input is rejected
        with self.assertRaises(HTTPError) as ctx:
            self.request(
                "/api/v1/ai/query",
                method="POST",
                data={"prompt": "", "mode": "general"},
                auth=True
            )
        self.assertIn(ctx.exception.status, [400, 422])

    def test_stream_endpoint_unauthorized(self):
        # 5. Unauthenticated request to stream endpoint must return 401
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/ai/stream", method="POST", data={"prompt": "hello"}, auth=False)
        self.assertEqual(ctx.exception.status, 401)

    def test_stream_endpoint_authorized_headers(self):
        # 6. Stream endpoint returns correct event-stream media headers
        response = self.request(
            "/api/v1/ai/stream",
            method="POST",
            data={"prompt": "Verify system locks state", "mode": "logs"},
            auth=True
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers.get("Content-Type"), "text/event-stream")
        self.assertEqual(response.headers.get("Cache-Control"), "no-cache")

    def test_stream_endpoint_payload_formatting(self):
        # 7. Streamed chunks have valid SSE formatting and emit [DONE] marker
        response = self.request(
            "/api/v1/ai/stream",
            method="POST",
            data={"prompt": "Verify system locks state", "mode": "logs"},
            auth=True
        )
        self.assertEqual(response.status, 200)
        lines = response.read().decode().split("\n")
        
        chunk_lines = [l for l in lines if l.startswith("data: ") and not l.endswith("[DONE]")]
        done_lines = [l for l in lines if l.startswith("data: [DONE]")]
        
        # Verify chunks formatting
        self.assertTrue(len(chunk_lines) > 0)
        for line in chunk_lines:
            json_str = line[6:].strip()
            parsed = json.loads(json_str)
            self.assertIn("chunk", parsed)
            
        # Verify completion marker emitted
        self.assertEqual(len(done_lines), 1)
